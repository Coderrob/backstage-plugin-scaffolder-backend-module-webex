#!/usr/bin/env bash
# Creates a disposable Backstage application for local integration testing.
set -euo pipefail

APP_NAME="my-backstage-app"
PLUGIN_NAME="backstage-plugin-scaffolder-backend-module-webex"
PLUGIN_SCOPE="@coderrob"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SOURCE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
APP_DIR="${BACKSTAGE_APP_DIR:-$(cd -- "$SOURCE_DIR/.." && pwd -P)/${APP_NAME}}"
PLUGIN_ARCHIVE=""
TEMP_PLUGIN_ARCHIVE=""
TEMPLATE_ID="send-webex-message"
TEMPLATE_PATH="scaffolder-templates/${TEMPLATE_ID}"

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Purpose: Report a fatal setup error and terminate the script.
# Arguments: All arguments are joined with spaces to form the error message.
# Globals: None.
# Outputs: A red, ERROR-prefixed line on standard error.
# Returns: Does not return; exits the process with status 1.
# Side effects: Terminates the running script.
error() {
  printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2
  exit 1
}

# Purpose: Announce the start of a major setup operation.
# Arguments: All arguments are joined with spaces to form the step title.
# Globals: None.
# Outputs: A green step heading on standard output.
# Returns: 0 unless printf fails.
# Side effects: None.
step() {
  printf '\n\033[1;32m==> %s\033[0m\n' "$*"
}

# Purpose: Verify that an executable is available on PATH.
# Arguments: $1 - executable name to locate.
# Globals: PATH.
# Outputs: Reports a fatal error when the executable is unavailable.
# Returns: 0 when found; otherwise terminates through error.
# Side effects: May terminate the script.
check() {
  command -v "$1" >/dev/null || error "Missing required tool: $1"
}

# Purpose: Verify all command-line tools required by local setup.
# Arguments: None.
# Globals: PATH.
# Outputs: Reports the first missing tool as a fatal error.
# Returns: 0 when every required tool is available.
# Side effects: May terminate the script through check.
check_prerequisites() {
  for tool in corepack git grep mkdir mktemp mv node npx rm sed; do
    check "$tool"
  done
}

# Purpose: Enable package-manager shims without an interactive download prompt.
# Arguments: None.
# Globals: COREPACK_ENABLE_DOWNLOAD_PROMPT, PATH.
# Outputs: Output from Corepack when it updates package-manager shims.
# Returns: 0 when Corepack and the Yarn shim are available.
# Side effects: May create or update Corepack shims beside the Node executable.
prepare_package_manager() {
  step "Preparing Corepack"
  if ! command -v yarn >/dev/null; then
    corepack enable
  fi
  check yarn
}

# Purpose: Ensure setup will not overwrite an existing disposable application.
# Arguments: None.
# Globals: APP_DIR.
# Outputs: Reports a fatal error when APP_DIR already exists.
# Returns: 0 when the setup target is available.
# Side effects: May terminate the script through error.
check_setup_target() {
  [[ ! -e "$APP_DIR" ]] || error "Setup directory already exists: $APP_DIR"
}

# Purpose: Remove the temporary plugin archive when the script exits.
# Arguments: None.
# Globals: TEMP_PLUGIN_ARCHIVE.
# Outputs: None.
# Returns: 0 when no archive exists or removal succeeds.
# Side effects: Deletes only the temporary archive created by package_plugin.
cleanup() {
  if [[ -n "$TEMP_PLUGIN_ARCHIVE" && -f "$TEMP_PLUGIN_ARCHIVE" ]]; then
    rm -f -- "$TEMP_PLUGIN_ARCHIVE"
  fi
}

# Purpose: Package the current plugin checkout for installation in Backstage.
# Arguments: None.
# Globals: SOURCE_DIR, TEMP_PLUGIN_ARCHIVE.
# Outputs: A step heading plus output from the package build and Yarn pack.
# Returns: 0 when a publish-shaped package archive is created.
# Side effects: Builds the plugin, creates a temporary archive, and runs package
#               lifecycle scripts.
package_plugin() {
  step "Packaging the current plugin checkout"
  TEMP_PLUGIN_ARCHIVE="$(mktemp "${TMPDIR:-/tmp}/webex-plugin.XXXXXX")"
  yarn --cwd "$SOURCE_DIR" tsc
  yarn --cwd "$SOURCE_DIR" build
  yarn --cwd "$SOURCE_DIR" pack --out "$TEMP_PLUGIN_ARCHIVE"
}

# Purpose: Generate the local Backstage application and enter its directory.
# Arguments: None.
# Globals: APP_DIR, APP_NAME, PLUGIN_ARCHIVE, PLUGIN_NAME,
#          TEMP_PLUGIN_ARCHIVE.
# Outputs: A step heading plus output from the Backstage application generator.
# Returns: 0 when generation and directory traversal succeed.
# Side effects: Creates APP_DIR and changes the current working directory.
create_backstage_app() {
  step "Creating Backstage app in '$APP_DIR'"
  BACKSTAGE_APP_NAME="$APP_NAME" \
    npx --yes @backstage/create-app@latest --path "$APP_DIR" --skip-install
  cd "$APP_DIR"
  mkdir -p .local-packages
  PLUGIN_ARCHIVE=".local-packages/${PLUGIN_NAME}.tgz"
  mv -- "$TEMP_PLUGIN_ARCHIVE" "$PLUGIN_ARCHIVE"
  TEMP_PLUGIN_ARCHIVE=""
}

# Purpose: Install the packaged local plugin as a backend dependency.
# Arguments: None.
# Globals: PLUGIN_NAME, PLUGIN_SCOPE.
# Outputs: A step heading plus output from yarn add.
# Returns: 0 when the backend manifest and installation are updated.
# Side effects: Adds a file dependency and installs application packages.
install_plugin_dependency() {
  step "Installing the packaged plugin in the backend package"
  yarn --cwd packages/backend add \
    "${PLUGIN_SCOPE}/${PLUGIN_NAME}@file:../../.local-packages/${PLUGIN_NAME}.tgz"
}

# Purpose: Add the Webex module to the Backstage backend.
# Arguments: None.
# Globals: PLUGIN_NAME, PLUGIN_SCOPE.
# Outputs: A step heading.
# Returns: 0 when registration exists or is inserted successfully.
# Side effects: May modify packages/backend/src/index.ts.
register_plugin_backend() {
  step "Registering the Webex backend module"

  local file="packages/backend/src/index.ts"
  local registration="backend.add(import('${PLUGIN_SCOPE}/${PLUGIN_NAME}'));"

  if ! grep -q "${PLUGIN_SCOPE}/${PLUGIN_NAME}" "$file"; then
    sed -i "/backend.start()/i ${registration}" "$file"
  fi
}

# Purpose: Create an example scaffolder template that sends a Webex message.
# Arguments: None.
# Globals: TEMPLATE_ID, TEMPLATE_PATH.
# Outputs: A step heading.
# Returns: 0 when the template directory and YAML file are created.
# Side effects: Creates or replaces TEMPLATE_PATH/template.yaml.
create_scaffolder_template() {
  step "Creating Webex scaffolder template"

  mkdir -p "$TEMPLATE_PATH"
  cat > "$TEMPLATE_PATH/template.yaml" <<EOF
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: ${TEMPLATE_ID}
  title: Send Webex Message
  description: Sends a message using the webex:webhooks:sendMessage action
spec:
  owner: user:default/guest
  type: service
  parameters:
    - title: Webex Message
      required: [text, webhookUrl]
      properties:
        text:
          type: string
          title: Message
        webhookUrl:
          type: string
          title: Webhook URL
  steps:
    - id: send
      name: Send Webex Message
      action: webex:webhooks:sendMessage
      input:
        format: text
        message: \${{ parameters.text }}
        webhooks:
          - \${{ parameters.webhookUrl }}
EOF
}

# Purpose: Configure the catalog to load the generated local template.
# Arguments: None.
# Globals: None.
# Outputs: A step heading.
# Returns: 0 when configuration exists or is appended successfully.
# Side effects: May append catalog configuration to app-config.local.yaml.
ensure_template_loader_configured() {
  step "Enabling template loader in app-config.local.yaml"

  local config="app-config.local.yaml"
  if [[ ! -f "$config" ]] || ! grep -q "$TEMPLATE_PATH/template.yaml" "$config"; then
    cat >> "$config" <<EOF

catalog:
  locations:
    - type: file
      target: ./${TEMPLATE_PATH}/template.yaml
EOF
  fi
}

# Purpose: Report that local Backstage setup completed successfully.
# Arguments: None.
# Globals: APP_DIR.
# Outputs: A completion message and the generated application path.
# Returns: 0 unless printf fails.
# Side effects: None.
success_message() {
  printf '\n\033[1;33mSetup complete: %s\033[0m\n' "$APP_DIR"
}

# Purpose: Start the generated Backstage development application by default.
# Arguments: None.
# Globals: APP_DIR, BACKSTAGE_START.
# Outputs: A step heading and output from the Backstage development processes.
# Returns: The exit status from yarn start, or 0 when startup is disabled.
# Side effects: Starts long-running frontend and backend development processes.
start_backstage_app() {
  if [[ "${BACKSTAGE_START:-true}" == "false" ]]; then
    printf 'Startup skipped. Run: cd %q && yarn start\n' "$APP_DIR"
    return
  fi

  step "Starting the Backstage app (press Ctrl+C to stop)"
  yarn start
}

# Purpose: Orchestrate the complete local Backstage and Webex plugin setup.
# Arguments: Accepts arguments for forward compatibility; currently ignores them.
# Globals: All setup constants declared at the top of this script.
# Outputs: Progress and command output from each setup stage.
# Returns: 0 when all stages succeed; exits immediately on the first failure.
# Side effects: Creates an app, packages and configures the plugin, and installs
#               application dependencies.
main() {
  trap cleanup EXIT
  check_prerequisites
  check_setup_target
  prepare_package_manager
  package_plugin
  create_backstage_app
  install_plugin_dependency
  register_plugin_backend
  create_scaffolder_template
  ensure_template_loader_configured
  success_message
  start_backstage_app
}

main "$@"
