#!/usr/bin/env bash
set -euo pipefail

APP_NAME="my-backstage-app"
PLUGIN_NAME="backstage-plugin-scaffolder-backend-module-webex"
PLUGIN_SCOPE="@coderrob"
PLUGIN_REPO="https://github.com/Coderrob/${PLUGIN_NAME}.git"
PLUGIN_DIR="plugins/${PLUGIN_NAME}"
TEMPLATE_ID="send-webex-message"
TEMPLATE_PATH="scaffolder-templates/${TEMPLATE_ID}"

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
  for tool in git yarn node npx; do
    check "$tool"
  done
}

# Purpose: Generate the local Backstage application and enter its directory.
# Arguments: None.
# Globals: APP_NAME.
# Outputs: A step heading plus output from the Backstage application generator.
# Returns: 0 when generation and directory traversal succeed.
# Side effects: Creates APP_NAME and changes the current working directory.
create_backstage_app() {
  step "Creating Backstage app in '$APP_NAME' (follow prompts manually)"
  npx @backstage/create-app@latest --path "$APP_NAME" --skip-install
  cd "$APP_NAME"
}

# Purpose: Clone the Webex scaffolder plugin into the app workspace.
# Arguments: None.
# Globals: PLUGIN_DIR, PLUGIN_REPO.
# Outputs: A step heading plus output from git clone.
# Returns: 0 when the directory is created and cloning succeeds.
# Side effects: Creates the plugins directory and a plugin working tree.
clone_plugin() {
  step "Cloning plugin"
  mkdir -p plugins
  git clone "$PLUGIN_REPO" "$PLUGIN_DIR"
}

# Purpose: Install the cloned plugin as a local backend dependency.
# Arguments: None.
# Globals: PLUGIN_DIR, PLUGIN_NAME, PLUGIN_SCOPE.
# Outputs: A step heading plus output from yarn add.
# Returns: 0 when the backend manifest and installation are updated.
# Side effects: Adds a file dependency and installs application packages.
install_plugin_dependency() {
  step "Installing the local plugin in the backend package"
  yarn --cwd packages/backend add \
    "${PLUGIN_SCOPE}/${PLUGIN_NAME}@file:../../${PLUGIN_DIR}"
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
  if ! grep -q "$TEMPLATE_PATH/template.yaml" "$config"; then
    cat >> "$config" <<EOF

catalog:
  locations:
    - type: file
      target: ./${TEMPLATE_PATH}/template.yaml
EOF
  fi
}

# Purpose: Print the commands needed to start the generated Backstage app.
# Arguments: None.
# Globals: APP_NAME.
# Outputs: A completion message and two shell commands on standard output.
# Returns: 0 unless printf fails.
# Side effects: None.
success_message() {
  printf '\n\033[1;33mSetup complete. To run your Backstage app:\033[0m\n'
  printf 'cd %s\n' "$APP_NAME"
  printf 'yarn dev\n'
}

# Purpose: Orchestrate the complete local Backstage and Webex plugin setup.
# Arguments: Accepts arguments for forward compatibility; currently ignores them.
# Globals: All setup constants declared at the top of this script.
# Outputs: Progress and command output from each setup stage.
# Returns: 0 when all stages succeed; exits immediately on the first failure.
# Side effects: Creates an app, clones and configures a plugin, and installs packages.
main() {
  check_prerequisites
  create_backstage_app
  clone_plugin
  install_plugin_dependency
  register_plugin_backend
  create_scaffolder_template
  ensure_template_loader_configured
  success_message
}

main "$@"
