module.exports = {
  apps: [
    {
      name: "sr-tradelink",
      script: "./start-standalone.sh",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
