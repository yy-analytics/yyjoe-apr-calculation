import { createClient, gql } from '@urql/core';
import { Interface } from 'ethers/lib/utils.js';
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

export const leftJoin = (array1, array2, leftOnKeys, rightOnKeys, defaults = {}) => {
    return array1.map(
        array1Obj => ({
            ...array1Obj,
            fromArray2: array2.filter(
                // This ensures we get every row where there's a match and that they match on all columns
                array2Obj => leftOnKeys.every(
                    (key, i) => array1Obj[key] === array2Obj[rightOnKeys[i]]
                )
            ).map(
                // This adds in the default and array1 info into each of the new objects
                array2Object => ({ ...defaults, ...array2Object, ...array1Obj })
            )
        })
    ).map(
        ({ fromArray2, ...array1Obj }) => ({
            ...array1Obj,
            // This ensures that we have something populated from array1 even when there's nothing that joins in array2 (normal behaviour for left join)
            fromArray2: fromArray2.length === 0 ? [{ ...defaults, ...array1Obj }] : fromArray2
        })
    ).reduce(
        // And this flattens out the array which allows the possibility of it being larger than the original (as is normal for left joins).
        (a, b) => a.concat(b.fromArray2),
        []
    );
};

export const getGraphData = async (apiURL, query, variables) => {
    const client = createClient({
        url: apiURL,
        fetch: fetch,
    });

    let result = null;
    result = await client.query(
        gql(query),
        variables
    ).toPromise();
    result = result["data"];
    return result;
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
        const resultDecoded = iface.decodeFunctionResult(contractFunction, result)
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
