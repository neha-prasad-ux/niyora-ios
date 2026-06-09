const { withEntitlementsPlist } = require("@expo/config-plugins");

// Niyora uses only local notifications (daily breath reminders), never remote
// push. expo-notifications adds the `aps-environment` entitlement by default,
// which forces the provisioning profile to carry the Push Notifications
// capability. We don't want or need that, so strip it during prebuild.
module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
