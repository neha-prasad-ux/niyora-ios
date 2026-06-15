const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Adds the HealthKit entitlement + usage descriptions for Niyora stress v1.
 * Mirrors the local-plugin pattern of withNoPushEntitlement.js.
 */
const withHealthKit = (config) => {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.healthkit'] = true;
    cfg.modResults['com.apple.developer.healthkit.access'] = [];
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSHealthShareUsageDescription =
      cfg.modResults.NSHealthShareUsageDescription ||
      'Niyora reads your heart rate to notice when you may be stressed and to show whether a calming action helped.';
    cfg.modResults.NSHealthUpdateUsageDescription =
      cfg.modResults.NSHealthUpdateUsageDescription ||
      'Niyora records brief sessions to measure your heart settling after an action.';
    return cfg;
  });

  return config;
};

module.exports = withHealthKit;
