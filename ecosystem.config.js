module.exports = {
  apps: [
    {
      name: 'mm-api',
      script: './main.js',
      // watch: true,
      env: {
        SECRET_ID: 'AKIDQM3UfbIitrcBZhX6UiiTxC9pENFqDMEp',
        SECRET_KEY: 'MWP1NSHq78sLYUAZhY9UZNuBBuLWQ3OT',
        DATABASE_URL: 'file:../mm.db',
        //   // DEBUG: 'prisma:client',
        SERVERLESS: 1,
        ALLOW_IP: '127.0.0.1,120.244.210,123.182.0,221.192.181',
      },
    },
  ],
}
