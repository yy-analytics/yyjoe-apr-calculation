import { BigNumber } from '@ethersproject/bignumber';

import {
    callContractFunction,
    convertWithDecimals,
    getLatestBlockNumber
} from "./utils.js";

import {
    YYJOE_ADDRESS,
    YYJOE_STAKING_ADDRESS,
    JOE_YYJOE_PAIR_ADDRESS,
    BOOSTED_MASTERCHEF_ADDRESS,
    PERCENTAGE_REWARDS_TO_YYJOE,
    YYJOE_STAKING_ABI,
    BOOSTED_MASTERCHEF_ABI,
    LP_TOKEN_ABI,
} from "./constants.js";

const getYyJoeAPR = async () => {
    //
    // Start by finding the latest blockNumber.
    //
    console.log("Getting latest blockNumber...");
    const latestBlock = await getLatestBlockNumber();
    console.log(`Latest block has been retrieved, number = ${BigNumber.from(latestBlock).toNumber()}, hexValue = ${latestBlock}`);
    //
    // Next we need the JoePerSec for boosted pools.
    //
    console.log("Getting the JoePerSec for Boosted MasterChef contract...");
    let joePerSec = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'joePerSec', [], latestBlock);
    joePerSec = convertWithDecimals(BigNumber.from(joePerSec).toString(), 18);
    const joePerYear = joePerSec * 60 * 60 * 24 * 365;
    console.log(`joePerSec = ${joePerSec} JOE`);
    //
    // Then need the totalAllocPoint for BMCJ.
    //
    console.log("Getting the totalAllocPoint for Boosted MasterChef contract...");
    let totalAllocPoint = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'totalAllocPoint', [], latestBlock);
    totalAllocPoint = BigNumber.from(totalAllocPoint).toNumber();
    console.log(`totalAllocPoint = ${totalAllocPoint}`);
    //
    // Now we need the poolLength so that we can call poolInfo and userInfo functions for all pools.
    //
    console.log("Getting the poolLength for Boosted MasterChef contract...");
    let poolLength = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'poolLength', [], latestBlock);
    poolLength = BigNumber.from(poolLength).toNumber();
    console.log(`poolLength = ${poolLength}`);
    //
    // Now we create an array of poolIDs, and query the poolInfo and userInfo data from the boosted masterchef contract.
    // We use this information, and everything else gathered so far to calculate the Joe earned per year.
    //
    const poolIDs = [...Array(poolLength).keys()];
    console.log(`Getting the poolInfo and userInfo for Boosted MasterChef contract for our ${poolLength} pools...`);
    const poolUserInfo = await Promise.all(poolIDs.map(
        async (poolID) => {
            const poolInfo = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'poolInfo', [poolID], latestBlock);
            let { allocPoint, veJoeShareBp, totalFactor, totalLpSupply } = poolInfo;
            allocPoint = BigNumber.from(allocPoint).toNumber();
            totalFactor = convertWithDecimals(BigNumber.from(totalFactor).toString(), 18);
            totalLpSupply = convertWithDecimals(BigNumber.from(totalLpSupply).toString(), 18);
            const userInfo = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'userInfo', [poolID, YYJOE_ADDRESS], latestBlock);
            let { amount, factor } = userInfo;
            amount = convertWithDecimals(BigNumber.from(amount).toString(), 18);
            factor = convertWithDecimals(BigNumber.from(factor).toString(), 18);
            return (
                {
                    poolID,
                    regularJoeEarnedPerYear: joePerYear * allocPoint * (1 - veJoeShareBp / 10000) * amount / (totalAllocPoint * totalLpSupply),
                    boostedJoeEarnedPerYear: joePerYear * allocPoint * (veJoeShareBp / 10000) * factor / (totalAllocPoint * totalFactor),
                }
            )
        }
    ));
    const totalJoeEarnedPerYear = poolUserInfo.reduce((a, b) => a + b.regularJoeEarnedPerYear + b.boostedJoeEarnedPerYear, 0);
    console.log(`Total JOE earned per year = ${totalJoeEarnedPerYear} JOE`);
    //
    // 15% of the Joe earned goes to yyJoe stakers.
    //
    const joeEarnedForYyJoeStakersPerYear = PERCENTAGE_REWARDS_TO_YYJOE * totalJoeEarnedPerYear;
    console.log(`JOE rewards to yyJoe stakers per year = ${joeEarnedForYyJoeStakersPerYear} JOE`);
    //
    // Need the amount of yyJoe that is staked.
    //
    console.log("Getting amount of yyJoe staked...");
    let yyJoeStaked = await callContractFunction(YYJOE_STAKING_ABI, YYJOE_STAKING_ADDRESS, 'internalBalance', [], latestBlock);
    yyJoeStaked = convertWithDecimals(BigNumber.from(yyJoeStaked).toString(), 18);
    console.log(`yyJoe staked = ${yyJoeStaked}`);
    //
    // We also need to current ratio of yyJoe to Joe, from the Trader Joe pool, in order to calculate the relative worth of yyJoe to Joe (for the APR).
    //
    console.log("Getting info for the pairs in each boosted farm...");
    const reserves = await callContractFunction(LP_TOKEN_ABI, JOE_YYJOE_PAIR_ADDRESS, 'getReserves', [], latestBlock);
    const { _reserve0, _reserve1 } = reserves;
    const reserve0 = convertWithDecimals(BigNumber.from(_reserve0).toString(), 18);
    const reserve1 = convertWithDecimals(BigNumber.from(_reserve1).toString(), 18);
    console.log(`JOE-yyJOE pair currently has ${Number(reserve0).toFixed(2)}... JOE and ${Number(reserve1).toFixed(2)}... yyJOE`);
    //
    // Here we get the ratio of Joe to yyJoe, giving it a maximum value of 1 as can always mint yyJOE at 1:1 ratio.
    //
    const yyJoeRatio = Math.min(1, Number(reserve0) / Number(reserve1));
    console.log(`JOE to yyJOE ratio = ${yyJoeRatio}`);
    const yyJoeStakedInJoe = yyJoeStaked * yyJoeRatio;
    //
    // And finally we can do our APR calculations.
    //
    const yyJoeAPR = joeEarnedForYyJoeStakersPerYear / yyJoeStaked;
    const yyJoeAPRWithDiscount = joeEarnedForYyJoeStakersPerYear / yyJoeStakedInJoe;
    console.log(`\nOverall yyJOE APR (assuming 1:1 ratio) = ${(100 * yyJoeAPR).toFixed(2)}% as of block ${BigNumber.from(latestBlock).toNumber()}`);
    console.log(`\nOverall yyJOE APR (using current JOE:yyJOE ratio) = ${(100 * yyJoeAPRWithDiscount).toFixed(2)}% as of block ${BigNumber.from(latestBlock).toNumber()}`);
};

getYyJoeAPR();