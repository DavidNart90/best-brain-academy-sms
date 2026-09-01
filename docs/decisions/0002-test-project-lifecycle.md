# D-01: Existing Free project is test-only

Date: 31 August 2026. Decision owner: Chief Engineer.

The user explicitly authorized `cefwopisbgfctzdloequ` for testing and all prepared
Phase 0 migrations, using the existing Free plan. This resolves the earlier target
designation blocker. No separate paid project or preview branch is required now.
The provider's main/Production label does not change the authorized test purpose.

Both application and integration tests may use this project. Tests must match its
reference, HTTPS host, publishable key format, explicit acknowledgement and the
test-only manifest. They must fail closed when these prerequisites are missing.
No production credentials, default administrator, live school data or business CRUD
are authorized by this decision.

Four migrations were applied through MCP with matching local filenames. Transient
SQL verification fixtures rolled back. Three explicit Auth/profile fixtures and two
test role assignments now persist for repeatable real-provider checks. Four roles,
nine permissions and 21 role-permission mappings are application configuration and
must not be removed as sample data.

Eventual conversion requires a reviewed fixture inventory and cleanup, session
revocation before test-account deletion, credential removal, disabling the test
manifest/CI target, real administrator provisioning and the later release gate.
Backups, recovery, MFA, approved origins and monitoring remain required. Clearing
tables alone does not make the project ready for live data; D-07 is still open.

See [backend setup](../backend-setup.md) and
[verification](../evidence/phase-0/backend-verification.md).
