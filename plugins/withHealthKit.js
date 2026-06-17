const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Adds the HealthKit entitlement + usage descriptions for Niyora stress v1.
 * Mirrors the local-plugin pattern of withNoPushEntitlement.js.
 *
 * GATED behind the NIYORA_HEALTHKIT=1 env var. The stress feature is not yet
 * user-facing, so App Store / launch builds must NOT declare HealthKit access
 * (Guideline 5.1.1 rejects an entitlement + "reads your heart rate" usage
 * string with no functional health UI). With the flag unset — the default, and
 * what production EAS builds use — this plugin is a no-op and the build ships
 * clean. Set NIYORA_HEALTHKIT=1 for dev/feature builds that exercise the stress
 * work (the `development` and `preview` EAS profiles set it; for a local
 * `expo run:ios` prepend `NIYORA_HEALTHKIT=1`). Flip the default here once a
 * real health feature ships. See memory: project_healthkit_not_in_launch_scope.
 */
const withHealthKit = (config) => {
  if (process.env.NIYORA_HEALTHKIT !== '1') {
    return config;
  }

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
