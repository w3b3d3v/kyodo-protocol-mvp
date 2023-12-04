const { exec } = require('child_process');

// const networks = ["ETHSepolia", "optimismGoerli", "avalancheFuji", "arbitrumGoerli", "polygonMumbai", "bnbTesnet", "baseGoerli", "polygonZkEvmTestnet", "testing"];
const networks = ["avalancheFuji", "polygonMumbai", "sepolia"];

networks.forEach(network => {
  exec(`npx hardhat deploy --network ${network}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Erro ao implantar na rede ${network}: ${err}`);
      return;
    }
    console.log(`Deployment to ${network} completed`);
    console.log(stdout);
  });
});