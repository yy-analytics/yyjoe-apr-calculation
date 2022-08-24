import { ethers, BigNumber } from 'ethers';

import {
    getGraphData,
    callContractFunction,
    convertWithDecimals,
    leftJoin
} from "./utils.js";

import {
    EXCHANGE_API_URL,
    BOOSTED_API_URL,
    VEJOE_API_URL,
    LATEST_BLOCK_API_URL,
    YYJOE_ADDRESS,
    YYJOE_STAKING_ADDRESS,
    JOE_YYJOE_PAIR_ADDRESS,
    BOOSTED_MASTERCHEF_ADDRESS,
    PERCENTAGE_REWARDS_TO_YYJOE,
    YYJOE_STAKING_ABI,
    BOOSTED_MASTERCHEF_ABI,
} from "./constants.js";

import {
    LATEST_BLOCK_QUERY,
    USER_VEJOE_QUERY,
    USER_BALANCE_QUERY,
    BOOSTED_PAIRS_QUERY,
    JOE_YYJOE_PAIR_QUERY,
} from "./queries.js";

const getYyJoeAPR = async () => {
    // Start by finding the latest blockNumber for the subgraphs we'll be using.
    console.log("Getting latest blockNumbers for subgraphs...");
    let latestBlockNumbers = await Promise.all([
        'traderjoe-xyz/exchange',
        'traderjoe-xyz/boosted-master-chef',
        'traderjoe-xyz/vejoe',
    ].map(sg => getGraphData(LATEST_BLOCK_API_URL, LATEST_BLOCK_QUERY, { subgraphName: sg })));
    latestBlockNumbers = latestBlockNumbers.map(data => Number(data["indexingStatusForCurrentVersion"]["chains"][0]["latestBlock"]["number"]));
    const latestBlock = Math.min(...latestBlockNumbers);
    console.log(`Latest block has been retrieved, number = ${latestBlock}`);
    // Next we need the JoePerSec for boosted pools.
    console.log("Getting the JoePerSec for Boosted MasterChef contract...")
    let joePerSec = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'joePerSec', [], ethers.utils.hexValue(latestBlock));
    joePerSec = convertWithDecimals(BigNumber.from(joePerSec).toString(), 18);
    const joePerYear = joePerSec * 60 * 60 * 24 * 365;
    console.log(`joePerSec = ${joePerSec} JOE`);
    // Need the veJoe balance for our yyJOE address.
    console.log("Getting veJOE balance for yyJOE...")
    let { user } = await getGraphData(VEJOE_API_URL, USER_VEJOE_QUERY, {
        id: YYJOE_ADDRESS,
        latestBlock: latestBlock,
    });
    const veJoeBalance = user.veJoeBalance;
    console.log(`veJoe balance = ${veJoeBalance}`);
    // Need the JLP balance for our yyJoe address in various boosted pools so that we can calculate the Joe earned for each pool and then in total.
    console.log("Getting Boosted Master Chef data and balance data...")
    let { masterChef } = await getGraphData(BOOSTED_API_URL, USER_BALANCE_QUERY, {
        id: BOOSTED_MASTERCHEF_ADDRESS,
        address: YYJOE_ADDRESS,
        latestBlock: latestBlock,
    })
    const { totalAllocPoint, pools } = masterChef;
    const boostedPairs = pools.map(pool => pool.pair);
    // console.log(`Boosted pairs = ${JSON.stringify(boostedPairs)}`);
    // Need information about the boostedPairs (name and balances).
    console.log("Getting info for the pairs in each boosted farm...")
    let { pairs } = await getGraphData(EXCHANGE_API_URL, BOOSTED_PAIRS_QUERY, {
        idList: boostedPairs,
        latestBlock: latestBlock,
    });
    console.log(`Information retrieved for pairs: ${JSON.stringify(pairs.map(p => p.name))}`);
    // We need the poolInfo for each pool so that we can get the totalFactor, and therefore calculate the amount of Joe earned by yyJoe pools.
    console.log("Getting poolInfo for boosted pools...")
    const poolIDs = pools.map(pool => pool.id);
    const poolInfo = await Promise.all(poolIDs.map(
        async (id) => {
            const result = await callContractFunction(BOOSTED_MASTERCHEF_ABI, BOOSTED_MASTERCHEF_ADDRESS, 'poolInfo', [id], ethers.utils.hexValue(latestBlock));
            const totalFactor = convertWithDecimals(BigNumber.from(result.totalFactor).toString(), 18);
            const veJoeShareBp = result.veJoeShareBp;
            return ({ poolID: id, totalFactor, veJoeShareBp });
        }
    ));
    console.log("poolInfo retrieved!:");
    // console.log(poolInfo);
    // Now we can calculate the total amount of Joe earned for each pool, and therefore in total, by yyJOE.
    console.log("Calculating total Joe earned...");
    let completeData = leftJoin(pools, poolInfo, ['id'], ['poolID']);
    completeData = leftJoin(completeData, pairs, ['pair'], ['id']);
    completeData = completeData.map(({ poolID, name, reserveUSD, totalSupply, totalFactor, veJoeShareBp, allocPoint, balance, jlpBalance, users }) => (
        {
            poolID: Number(poolID),
            name,
            poolTVL: Number(jlpBalance) * Number(reserveUSD) / Number(totalSupply),
            userTVL: users.length > 0 ? convertWithDecimals(users[0].amount, 18) * Number(jlpBalance) * Number(reserveUSD) / (Number(totalSupply) * convertWithDecimals(balance, 18)) : 0,
            poolJLPBalance: Number(jlpBalance),
            userJLPBalance: users.length > 0 ? convertWithDecimals(users[0].amount, 18) : 0,
            allocPoint: Number(allocPoint),
            veJoeShareBp,
            totalFactor
        }
    ));
    completeData = completeData.map(
        pool => (
            {
                ...pool,
                userFactor: Math.sqrt(pool.userJLPBalance * veJoeBalance),
                totalJoeEarnedPerYearForPool: joePerYear * pool.allocPoint / totalAllocPoint,
                regularJoeEarnedPerYear: joePerYear * pool.allocPoint * (1 - pool.veJoeShareBp / 10000) * pool.userJLPBalance / (totalAllocPoint * pool.poolJLPBalance),
                boostedJoeEarnedPerYear: joePerYear * pool.allocPoint * (pool.veJoeShareBp / 10000) * Math.sqrt(pool.userJLPBalance * veJoeBalance) / (totalAllocPoint * pool.totalFactor),
            }
        )
    );
    // console.log(completeData);
    const totalJoeEarnedPerYear = completeData.reduce((a, b) => a + b.regularJoeEarnedPerYear + b.boostedJoeEarnedPerYear, 0);
    console.log(`Total JOE earned per year = ${totalJoeEarnedPerYear} JOE`);
    // 5% of the Joe earned goes to yyJoe stakers
    const joeEarnedForYyJoeStakersPerYear = PERCENTAGE_REWARDS_TO_YYJOE * totalJoeEarnedPerYear;
    console.log(`JOE rewards to yyJoe stakers per year = ${joeEarnedForYyJoeStakersPerYear} JOE`);
    // Need the amount of yyJoe that is staked.
    console.log("Getting amount of yyJoe staked...");
    let yyJoeStaked = await callContractFunction(YYJOE_STAKING_ABI, YYJOE_STAKING_ADDRESS, 'internalBalance', [], ethers.utils.hexValue(latestBlock));
    yyJoeStaked = convertWithDecimals(BigNumber.from(yyJoeStaked).toString(), 18);
    console.log(`yyJoe staked = ${yyJoeStaked}`);
    // We also need to current ratio of yyJoe to Joe, from the Trader Joe pool, in order to calculate the relative worth of yyJoe to Joe (for the APR).
    console.log("Getting info for the pairs in each boosted farm...")
    const { pair } = await getGraphData(EXCHANGE_API_URL, JOE_YYJOE_PAIR_QUERY, {
        id: JOE_YYJOE_PAIR_ADDRESS,
        latestBlock: latestBlock,
    });
    const { name, reserve0, reserve1, reserveUSD } = pair;
    console.log(`${name} pair currently has $${Number(reserveUSD).toFixed(2)} in liquidity, with ${Number(reserve0).toFixed(2)}... JOE and ${Number(reserve1).toFixed(2)}... yyJOE`);
    // Here we get the ratio of Joe to yyJoe, giving it a maximum value of 1 as can always mint yyJOE at 1:1 ratio.
    const yyJoeRatio = Math.min(1, Number(reserve0) / Number(reserve1));
    console.log(`JOE to yyJOE ratio = ${yyJoeRatio}`);
    const yyJoeStakedInJoe = yyJoeStaked * yyJoeRatio;
    const yyJoeAPR = joeEarnedForYyJoeStakersPerYear / yyJoeStaked;
    const yyJoeAPRWithDiscount = joeEarnedForYyJoeStakersPerYear / yyJoeStakedInJoe;
    console.log(`\nOverall yyJOE APR (assuming 1:1 ratio) = ${(100 * yyJoeAPR).toFixed(2)}% as of block ${latestBlock}`);
    console.log(`\nOverall yyJOE APR (using current JOE:yyJOE ratio) = ${(100 * yyJoeAPRWithDiscount).toFixed(2)}% as of block ${latestBlock}`);
};

getYyJoeAPR();