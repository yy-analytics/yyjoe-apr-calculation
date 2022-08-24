import { Interface } from '@ethersproject/abi';
import fetch from "node-fetch";

import {
    ANKR_RPC_URL
} from './constants.js';

export const convertWithDecimals = (numberString, decimals) => {
    if (decimals && numberString) {
        return Number(numberString.padStart(decimals + 1, '0').replace(RegExp(`(\\d+)(\\d{${decimals}})`), '$1.$2'));
    };
    return undefined;
};

export const getLatestBlockNumber = async (rpcURL = ANKR_RPC_URL) => {
    try {
        const _ = await fetch(rpcURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
            }),
        });
        const { result } = await _.json();
        return result;
    } catch (e) {
        // Have added the below section because it seems that the RPC url sometimes times out, in which case we need to retry it until we get the data needed.
        if (e["code"] === "ETIMEDOUT" || e["code"] === "ECONNRESET") {
            // console.log('Trying again in 2 seconds...');
            await delay();
            let res = await getLatestBlockNumber(rpcURL);
            return res;
        }
        console.error(`${e["code"]} error - Error calling function eth_blockNumber`);
        console.error(e);
        return undefined;
    }
};

export const callContractFunction = async (abi, contractAddress, contractFunction, functionData = [], defaultBlock = 'latest', rpcURL = ANKR_RPC_URL) => {
    const iface = new Interface(abi);
    try {
        const _ = await fetch(rpcURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                    {
                        to: contractAddress,
                        data: iface.encodeFunctionData(contractFunction, functionData),
                    },
                    defaultBlock,
                ],
            }),
        });
        const { result } = await _.json();
        if (result == null) {
            return result;
        }
        const resultDecoded = iface.decodeFunctionResult(contractFunction, result);
        // This part is just for ease of use with the results afterwards.
        if (resultDecoded.length === 1) {
            return resultDecoded[0];
        } else {
            return resultDecoded;
        }
    } catch (e) {
        // Have added the below section because it seems that the RPC url often times out, in which case we need to retry it until we get the data needed.
        if (e["code"] === "ETIMEDOUT" || e["code"] === "ECONNRESET") {
            // console.log('Trying again in 2 seconds...');
            await delay();
            let res = await callContractFunction(abi, contractAddress, contractFunction, functionData, defaultBlock, rpcURL);
            return res;
        }
        console.error(`${e["code"]} error - Error calling function ${contractFunction} for contract ${contractAddress}`);
        return undefined;
    }
};
