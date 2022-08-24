export const LATEST_BLOCK_QUERY = `
query indexingStatusForCurrentVersion($subgraphName: String) {
  indexingStatusForCurrentVersion(subgraphName: $subgraphName) {
      chains(network: "avalanche") {
          network
          latestBlock {
              hash
              number
          }
      }
  }
}
`;

export const USER_VEJOE_QUERY = `
query users($id: String, $latestBlock: Int) {
  user(id: $id, block: {number: $latestBlock}) {
    veJoeBalance
  }
}
`;

export const USER_BALANCE_QUERY = `
query masterChef($id: String, $address: String, $latestBlock: Int) {
  masterChef(id: $id, block: {number: $latestBlock}) {
    totalAllocPoint
    pools(first: 1000) {
      id
      pair
      allocPoint
      balance
      jlpBalance
      users(first: 1, where: {address: $address}) {
        amount
      }
    }
  }
}
`;

export const BOOSTED_PAIRS_QUERY = `
query($idList: [String], $latestBlock: Int) {
  pairs(first: 1000, where: {id_in: $idList}, block: {number: $latestBlock}) {
    id
    name
    reserveUSD
    totalSupply
  }
}
`;

export const JOE_YYJOE_PAIR_QUERY = `
query($id: String, $latestBlock: Int) {
  pair(id: $id, block: {number: $latestBlock}) {
    id
    name
    reserve0
    reserve1
    reserveUSD
  }
}
`;