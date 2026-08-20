module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['./scripts/turkish-ui-babel-plugin.cjs'],
  };
};
