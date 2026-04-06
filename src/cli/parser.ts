/**
 * Phase 1: CLI Parsing
 *
 * Extracts Commander.js subcommand registration from main.tsx.
 * The main command (.action handler) stays in main.tsx since it
 * orchestrates all startup phases. This module handles subcommands
 * (mcp, auth, plugin, doctor, update, etc.) which are self-contained.
 */
import { feature } from 'bun:bundle';
import { type Command as CommanderCommand, Option } from '@commander-js/extra-typings';
import { registerMcpAddCommand } from '../commands/mcp/addCommand.js';
import { registerMcpXaaIdpCommand } from '../commands/mcp/xaaIdpCommand.js';
import { isXaaEnabled } from '../services/mcp/xaaIdpLogin.js';
import { VALID_INSTALLABLE_SCOPES, VALID_UPDATE_SCOPES } from '../services/plugins/pluginCliCommands.js';
import { TASK_STATUSES } from '../utils/tasks.js';
import { getBaseRenderOptions } from '../utils/renderOptions.js';
import { validateUuid } from '../utils/uuid.js';
import { getAutoModeEnabledStateIfCached } from '../utils/permissions/permissionSetup.js';
import { createDirectConnectSession, DirectConnectError } from '../server/createDirectConnectSession.js';
import { getOriginalCwd, setCwdState } from './state_reexport.js';
import { setDirectConnectServerUrl } from '../state/sessionConfig.js';
import { setOriginalCwd } from '../bootstrap/state.js';
import { profileCheckpoint } from '../utils/startupProfiler.js';

// Re-export from bootstrap/state to avoid circular deps in this module
// The actual state functions are imported where needed

/**
 * Register all subcommands on the Commander program instance.
 * Called from run() in main.tsx after the main command .action() is defined.
 *
 * This function registers: mcp, server, ssh, open, auth, plugin/marketplace,
 * setup-token, agents, auto-mode, remote-control, assistant, doctor, update,
 * install, rollback, up, log, error, export, task, completion.
 */
export function registerSubcommands(
  program: CommanderCommand,
  createSortedHelpConfig: () => { sortSubcommands: true; sortOptions: true },
  _pendingConnect: { url: string | undefined; authToken: string | undefined; dangerouslySkipPermissions: boolean } | undefined,
): void {
  profileCheckpoint('register_subcommands_start');

  // claude mcp
  const mcp = program.command('mcp').description('Configure and manage MCP servers').configureHelp(createSortedHelpConfig()).enablePositionalOptions();
  mcp.command('serve').description(`Start the Nexus MCP server`).option('-d, --debug', 'Enable debug mode', () => true).option('--verbose', 'Override verbose mode setting from config', () => true).action(async ({
    debug,
    verbose
  }: {
    debug?: boolean;
    verbose?: boolean;
  }) => {
    const {
      mcpServeHandler
    } = await import('./handlers/mcp.js');
    await mcpServeHandler({
      debug,
      verbose
    });
  });

  registerMcpAddCommand(mcp);
  if (isXaaEnabled()) {
    registerMcpXaaIdpCommand(mcp);
  }
  mcp.command('remove <name>').description('Remove an MCP server').option('-s, --scope <scope>', 'Configuration scope (local, user, or project) - if not specified, removes from whichever scope it exists in').action(async (name: string, options: {
    scope?: string;
  }) => {
    const {
      mcpRemoveHandler
    } = await import('./handlers/mcp.js');
    await mcpRemoveHandler(name, options);
  });
  mcp.command('list').description('List configured MCP servers. Note: The workspace trust dialog is skipped and stdio servers from .mcp.json are spawned for health checks. Only use this command in directories you trust.').action(async () => {
    const {
      mcpListHandler
    } = await import('./handlers/mcp.js');
    await mcpListHandler();
  });
  mcp.command('get <name>').description('Get details about an MCP server. Note: The workspace trust dialog is skipped and stdio servers from .mcp.json are spawned for health checks. Only use this command in directories you trust.').action(async (name: string) => {
    const {
      mcpGetHandler
    } = await import('./handlers/mcp.js');
    await mcpGetHandler(name);
  });
  mcp.command('add-json <name> <json>').description('Add an MCP server (stdio or SSE) with a JSON string').option('-s, --scope <scope>', 'Configuration scope (local, user, or project)', 'local').option('--client-secret', 'Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)').action(async (name: string, json: string, options: {
    scope?: string;
    clientSecret?: true;
  }) => {
    const {
      mcpAddJsonHandler
    } = await import('./handlers/mcp.js');
    await mcpAddJsonHandler(name, json, options);
  });
  mcp.command('add-from-claude-desktop').description('Import MCP servers from Claude Desktop (Mac and WSL only)').option('-s, --scope <scope>', 'Configuration scope (local, user, or project)', 'local').action(async (options: {
    scope?: string;
  }) => {
    const {
      mcpAddFromDesktopHandler
    } = await import('./handlers/mcp.js');
    await mcpAddFromDesktopHandler(options);
  });
  mcp.command('reset-project-choices').description('Reset all approved and rejected project-scoped (.mcp.json) servers within this project').action(async () => {
    const {
      mcpResetChoicesHandler
    } = await import('./handlers/mcp.js');
    await mcpResetChoicesHandler();
  });

  // claude server
  if (feature('DIRECT_CONNECT')) {
    program.command('server').description('Start a Nexus session server').option('--port <number>', 'HTTP port', '0').option('--host <string>', 'Bind address', '0.0.0.0').option('--auth-token <token>', 'Bearer token for auth').option('--unix <path>', 'Listen on a unix domain socket').option('--workspace <dir>', 'Default working directory for sessions that do not specify cwd').option('--idle-timeout <ms>', 'Idle timeout for detached sessions in ms (0 = never expire)', '600000').option('--max-sessions <n>', 'Maximum concurrent sessions (0 = unlimited)', '32').action(async (opts: {
      port: string;
      host: string;
      authToken?: string;
      unix?: string;
      workspace?: string;
      idleTimeout: string;
      maxSessions: string;
    }) => {
      const {
        randomBytes
      } = await import('crypto');
      const {
        startServer
      } = await import('../server/server.js');
      const {
        SessionManager
      } = await import('../server/sessionManager.js');
      const {
        DangerousBackend
      } = await import('../server/backends/dangerousBackend.js');
      const {
        printBanner
      } = await import('../server/serverBanner.js');
      const {
        createServerLogger
      } = await import('../server/serverLog.js');
      const {
        writeServerLock,
        removeServerLock,
        probeRunningServer
      } = await import('../server/lockfile.js');
      const existing = await probeRunningServer();
      if (existing) {
        process.stderr.write(`A claude server is already running (pid ${existing.pid}) at ${existing.httpUrl}\n`);
        process.exit(1);
      }
      const authToken = opts.authToken ?? `sk-ant-cc-${randomBytes(16).toString('base64url')}`;
      const config = {
        port: parseInt(opts.port, 10),
        host: opts.host,
        authToken,
        unix: opts.unix,
        workspace: opts.workspace,
        idleTimeoutMs: parseInt(opts.idleTimeout, 10),
        maxSessions: parseInt(opts.maxSessions, 10)
      };
      const backend = new DangerousBackend();
      const sessionManager = new SessionManager(backend, {
        idleTimeoutMs: config.idleTimeoutMs,
        maxSessions: config.maxSessions
      });
      const logger = createServerLogger();
      const server = startServer(config, sessionManager, logger);
      const actualPort = server.port ?? config.port;
      printBanner(config, authToken, actualPort);
      await writeServerLock({
        pid: process.pid,
        port: actualPort,
        host: config.host,
        httpUrl: config.unix ? `unix:${config.unix}` : `http://${config.host}:${actualPort}`,
        startedAt: Date.now()
      });
      let shuttingDown = false;
      const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        server.stop(true);
        await sessionManager.destroyAll();
        await removeServerLock();
        process.exit(0);
      };
      process.once('SIGINT', () => void shutdown());
      process.once('SIGTERM', () => void shutdown());
    });
  }

  // claude ssh stub
  if (feature('SSH_REMOTE')) {
    program.command('ssh <host> [dir]').description('Run Nexus on a remote host over SSH. Deploys the binary and ' + 'tunnels API auth back through your local machine — no remote setup needed.').option('--permission-mode <mode>', 'Permission mode for the remote session').option('--dangerously-skip-permissions', 'Skip all permission prompts on the remote (dangerous)').option('--local', 'e2e test mode — spawn the child CLI locally (skip ssh/deploy). ' + 'Exercises the auth proxy and unix-socket plumbing without a remote host.').action(async () => {
      process.stderr.write('Usage: claude ssh <user@host | ssh-config-alias> [dir]\n\n' + "Runs Nexus on a remote Linux host. You don't need to install\n" + 'anything on the remote or run `claude auth login` there — the binary is\n' + 'deployed over SSH and API auth tunnels back through your local machine.\n');
      process.exit(1);
    });
  }

  // claude open (direct connect headless)
  if (feature('DIRECT_CONNECT')) {
    program.command('open <cc-url>').description('Connect to a Nexus server (internal — use cc:// URLs)').option('-p, --print [prompt]', 'Print mode (headless)').option('--output-format <format>', 'Output format: text, json, stream-json', 'text').action(async (ccUrl: string, opts: {
      print?: string | boolean;
      outputFormat: string;
    }) => {
      const {
        parseConnectUrl
      } = await import('../server/parseConnectUrl.js');
      const {
        serverUrl,
        authToken
      } = parseConnectUrl(ccUrl);
      let connectConfig;
      try {
        const session = await createDirectConnectSession({
          serverUrl,
          authToken,
          cwd: getOriginalCwd(),
          dangerouslySkipPermissions: _pendingConnect?.dangerouslySkipPermissions
        });
        if (session.workDir) {
          setOriginalCwd(session.workDir);
          setCwdState(session.workDir);
        }
        setDirectConnectServerUrl(serverUrl);
        connectConfig = session.config;
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: intentional error output
        console.error(err instanceof DirectConnectError ? err.message : String(err));
        process.exit(1);
      }
      const {
        runConnectHeadless
      } = await import('../server/connectHeadless.js');
      const prompt = typeof opts.print === 'string' ? opts.print : '';
      const interactive = opts.print === true;
      await runConnectHeadless(connectConfig, prompt, opts.outputFormat, interactive);
    });
  }

  // claude auth
  const auth = program.command('auth').description('Manage authentication').configureHelp(createSortedHelpConfig());
  auth.command('login').description('Sign in to your Anthropic account').option('--email <email>', 'Pre-populate email address on the login page').option('--sso', 'Force SSO login flow').option('--console', 'Use Anthropic Console (API usage billing) instead of Claude subscription').option('--claudeai', 'Use Claude subscription (default)').action(async ({
    email,
    sso,
    console: useConsole,
    claudeai
  }: {
    email?: string;
    sso?: boolean;
    console?: boolean;
    claudeai?: boolean;
  }) => {
    const {
      authLogin
    } = await import('./handlers/auth.js');
    await authLogin({
      email,
      sso,
      console: useConsole,
      claudeai
    });
  });
  auth.command('status').description('Show authentication status').option('--json', 'Output as JSON (default)').option('--text', 'Output as human-readable text').action(async (opts: {
    json?: boolean;
    text?: boolean;
  }) => {
    const {
      authStatus
    } = await import('./handlers/auth.js');
    await authStatus(opts);
  });
  auth.command('logout').description('Log out from your Anthropic account').action(async () => {
    const {
      authLogout
    } = await import('./handlers/auth.js');
    await authLogout();
  });

  // Plugin commands
  const coworkOption = () => new Option('--cowork', 'Use cowork_plugins directory').hideHelp();
  const pluginCmd = program.command('plugin').alias('plugins').description('Manage Nexus plugins').configureHelp(createSortedHelpConfig());
  pluginCmd.command('validate <path>').description('Validate a plugin or marketplace manifest').addOption(coworkOption()).action(async (manifestPath: string, options: {
    cowork?: boolean;
  }) => {
    const {
      pluginValidateHandler
    } = await import('./handlers/plugins.js');
    await pluginValidateHandler(manifestPath, options);
  });
  pluginCmd.command('list').description('List installed plugins').option('--json', 'Output as JSON').option('--available', 'Include available plugins from marketplaces (requires --json)').addOption(coworkOption()).action(async (options: {
    json?: boolean;
    available?: boolean;
    cowork?: boolean;
  }) => {
    const {
      pluginListHandler
    } = await import('./handlers/plugins.js');
    await pluginListHandler(options);
  });

  // Marketplace subcommands
  const marketplaceCmd = pluginCmd.command('marketplace').description('Manage Nexus marketplaces').configureHelp(createSortedHelpConfig());
  marketplaceCmd.command('add <source>').description('Add a marketplace from a URL, path, or GitHub repo').addOption(coworkOption()).option('--sparse <paths...>', 'Limit checkout to specific directories via git sparse-checkout (for monorepos). Example: --sparse .claude-plugin plugins').option('--scope <scope>', 'Where to declare the marketplace: user (default), project, or local').action(async (source: string, options: {
    cowork?: boolean;
    sparse?: string[];
    scope?: string;
  }) => {
    const {
      marketplaceAddHandler
    } = await import('./handlers/plugins.js');
    await marketplaceAddHandler(source, options);
  });
  marketplaceCmd.command('list').description('List all configured marketplaces').option('--json', 'Output as JSON').addOption(coworkOption()).action(async (options: {
    json?: boolean;
    cowork?: boolean;
  }) => {
    const {
      marketplaceListHandler
    } = await import('./handlers/plugins.js');
    await marketplaceListHandler(options);
  });
  marketplaceCmd.command('remove <name>').alias('rm').description('Remove a configured marketplace').addOption(coworkOption()).action(async (name: string, options: {
    cowork?: boolean;
  }) => {
    const {
      marketplaceRemoveHandler
    } = await import('./handlers/plugins.js');
    await marketplaceRemoveHandler(name, options);
  });
  marketplaceCmd.command('update [name]').description('Update marketplace(s) from their source - updates all if no name specified').addOption(coworkOption()).action(async (name: string | undefined, options: {
    cowork?: boolean;
  }) => {
    const {
      marketplaceUpdateHandler
    } = await import('./handlers/plugins.js');
    await marketplaceUpdateHandler(name, options);
  });

  // Plugin install/uninstall/enable/disable/update
  pluginCmd.command('install <plugin>').alias('i').description('Install a plugin from available marketplaces (use plugin@marketplace for specific marketplace)').option('-s, --scope <scope>', 'Installation scope: user, project, or local', 'user').addOption(coworkOption()).action(async (plugin: string, options: {
    scope?: string;
    cowork?: boolean;
  }) => {
    const {
      pluginInstallHandler
    } = await import('./handlers/plugins.js');
    await pluginInstallHandler(plugin, options);
  });
  pluginCmd.command('uninstall <plugin>').alias('remove').alias('rm').description('Uninstall an installed plugin').option('-s, --scope <scope>', 'Uninstall from scope: user, project, or local', 'user').option('--keep-data', "Preserve the plugin's persistent data directory (~/.claude/plugins/data/{id}/)").addOption(coworkOption()).action(async (plugin: string, options: {
    scope?: string;
    cowork?: boolean;
    keepData?: boolean;
  }) => {
    const {
      pluginUninstallHandler
    } = await import('./handlers/plugins.js');
    await pluginUninstallHandler(plugin, options);
  });
  pluginCmd.command('enable <plugin>').description('Enable a disabled plugin').option('-s, --scope <scope>', `Installation scope: ${VALID_INSTALLABLE_SCOPES.join(', ')} (default: auto-detect)`).addOption(coworkOption()).action(async (plugin: string, options: {
    scope?: string;
    cowork?: boolean;
  }) => {
    const {
      pluginEnableHandler
    } = await import('./handlers/plugins.js');
    await pluginEnableHandler(plugin, options);
  });
  pluginCmd.command('disable [plugin]').description('Disable an enabled plugin').option('-a, --all', 'Disable all enabled plugins').option('-s, --scope <scope>', `Installation scope: ${VALID_INSTALLABLE_SCOPES.join(', ')} (default: auto-detect)`).addOption(coworkOption()).action(async (plugin: string | undefined, options: {
    scope?: string;
    cowork?: boolean;
    all?: boolean;
  }) => {
    const {
      pluginDisableHandler
    } = await import('./handlers/plugins.js');
    await pluginDisableHandler(plugin, options);
  });
  pluginCmd.command('update <plugin>').description('Update a plugin to the latest version (restart required to apply)').option('-s, --scope <scope>', `Installation scope: ${VALID_UPDATE_SCOPES.join(', ')} (default: user)`).addOption(coworkOption()).action(async (plugin: string, options: {
    scope?: string;
    cowork?: boolean;
  }) => {
    const {
      pluginUpdateHandler
    } = await import('./handlers/plugins.js');
    await pluginUpdateHandler(plugin, options);
  });

  // claude setup-token
  program.command('setup-token').description('Set up a long-lived authentication token (requires Claude subscription)').action(async () => {
    const [{
      setupTokenHandler
    }, {
      createRoot
    }] = await Promise.all([import('./handlers/util.js'), import('../ink.js')]);
    const root = await createRoot(getBaseRenderOptions(false));
    await setupTokenHandler(root);
  });

  // claude agents
  program.command('agents').description('List configured agents').option('--setting-sources <sources>', 'Comma-separated list of setting sources to load (user, project, local).').action(async () => {
    const {
      agentsHandler
    } = await import('./handlers/agents.js');
    await agentsHandler();
    process.exit(0);
  });

  // claude auto-mode
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    if (getAutoModeEnabledStateIfCached() !== 'disabled') {
      const autoModeCmd = program.command('auto-mode').description('Inspect auto mode classifier configuration');
      autoModeCmd.command('defaults').description('Print the default auto mode environment, allow, and deny rules as JSON').action(async () => {
        const {
          autoModeDefaultsHandler
        } = await import('./handlers/autoMode.js');
        autoModeDefaultsHandler();
        process.exit(0);
      });
      autoModeCmd.command('config').description('Print the effective auto mode config as JSON: your settings where set, defaults otherwise').action(async () => {
        const {
          autoModeConfigHandler
        } = await import('./handlers/autoMode.js');
        autoModeConfigHandler();
        process.exit(0);
      });
      autoModeCmd.command('critique').description('Get AI feedback on your custom auto mode rules').option('--model <model>', 'Override which model is used').action(async options => {
        const {
          autoModeCritiqueHandler
        } = await import('./handlers/autoMode.js');
        await autoModeCritiqueHandler(options);
        process.exit();
      });
    }
  }

  // claude remote-control
  if (feature('BRIDGE_MODE')) {
    program.command('remote-control', {
      hidden: true
    }).alias('rc').description('Connect your local environment for remote-control sessions via claude.ai/code').action(async () => {
      const {
        bridgeMain
      } = await import('../bridge/bridgeMain.js');
      await bridgeMain(process.argv.slice(3));
    });
  }

  // claude assistant stub
  if (feature('ASSISTANT_MODE')) {
    program.command('assistant [sessionId]').description('Attach the REPL as a client to a running bridge session. Discovers sessions via API if no sessionId given.').action(() => {
      process.stderr.write('Usage: claude assistant [sessionId]\n\n' + 'Attach the REPL as a viewer client to a running bridge session.\n' + 'Omit sessionId to discover and pick from available sessions.\n');
      process.exit(1);
    });
  }

  // claude doctor
  program.command('doctor').description('Check the health of your Nexus auto-updater. Note: The workspace trust dialog is skipped and stdio servers from .mcp.json are spawned for health checks. Only use this command in directories you trust.').action(async () => {
    const [{
      doctorHandler
    }, {
      createRoot
    }] = await Promise.all([import('./handlers/util.js'), import('../ink.js')]);
    const root = await createRoot(getBaseRenderOptions(false));
    await doctorHandler(root);
  });

  // claude update
  program.command('update').alias('upgrade').description('Check for updates and install if available').action(async () => {
    const {
      update
    } = await import('./update.js');
    await update();
  });

  // claude up (ant-only)
  if ("external" === 'ant') {
    program.command('up').description('[ANT-ONLY] Initialize or upgrade the local dev environment using the "# claude up" section of the nearest CLAUDE.md').action(async () => {
      const {
        up
      } = await import('./up.js');
      await up();
    });
  }

  // claude rollback (ant-only)
  if ("external" === 'ant') {
    program.command('rollback [target]').description('[ANT-ONLY] Roll back to a previous release\n\nExamples:\n  claude rollback                                    Go 1 version back from current\n  claude rollback 3                                  Go 3 versions back from current\n  claude rollback 2.0.73-dev.20251217.t190658        Roll back to a specific version').option('-l, --list', 'List recent published versions with ages').option('--dry-run', 'Show what would be installed without installing').option('--safe', 'Roll back to the server-pinned safe version (set by oncall during incidents)').action(async (target?: string, options?: {
      list?: boolean;
      dryRun?: boolean;
      safe?: boolean;
    }) => {
      const {
        rollback
      } = await import('./rollback.js');
      await rollback(target, options);
    });
  }

  // claude install
  program.command('install [target]').description('Install Nexus native build. Use [target] to specify version (stable, latest, or specific version)').option('--force', 'Force installation even if already installed').action(async (target: string | undefined, options: {
    force?: boolean;
  }) => {
    const {
      installHandler
    } = await import('./handlers/util.js');
    await installHandler(target, options);
  });

  // Internal-only commands
  if ("external" === 'ant') {
    const validateLogId = (value: string) => {
      const maybeSessionId = validateUuid(value);
      if (maybeSessionId) return maybeSessionId;
      return Number(value);
    };
    program.command('log').description('[ANT-ONLY] Manage conversation logs.').argument('[number|sessionId]', 'A number (0, 1, 2, etc.) to display a specific log, or the sesssion ID (uuid) of a log', validateLogId).action(async (logId: string | number | undefined) => {
      const {
        logHandler
      } = await import('./handlers/ant.js');
      await logHandler(logId);
    });

    program.command('error').description('[ANT-ONLY] View error logs. Optionally provide a number (0, -1, -2, etc.) to display a specific log.').argument('[number]', 'A number (0, 1, 2, etc.) to display a specific log', parseInt).action(async (number: number | undefined) => {
      const {
        errorHandler
      } = await import('./handlers/ant.js');
      await errorHandler(number);
    });

    program.command('export').description('[ANT-ONLY] Export a conversation to a text file.').usage('<source> <outputFile>').argument('<source>', 'Session ID, log index (0, 1, 2...), or path to a .json/.jsonl log file').argument('<outputFile>', 'Output file path for the exported text').addHelpText('after', `
Examples:
  $ claude export 0 conversation.txt                Export conversation at log index 0
  $ claude export <uuid> conversation.txt           Export conversation by session ID
  $ claude export input.json output.txt             Render JSON log file to text
  $ claude export <uuid>.jsonl output.txt           Render JSONL session file to text`).action(async (source: string, outputFile: string) => {
      const {
        exportHandler
      } = await import('./handlers/ant.js');
      await exportHandler(source, outputFile);
    });

    // claude task
    const taskCmd = program.command('task').description('[ANT-ONLY] Manage task list tasks');
    taskCmd.command('create <subject>').description('Create a new task').option('-d, --description <text>', 'Task description').option('-l, --list <id>', 'Task list ID (defaults to "tasklist")').action(async (subject: string, opts: {
      description?: string;
      list?: string;
    }) => {
      const {
        taskCreateHandler
      } = await import('./handlers/ant.js');
      await taskCreateHandler(subject, opts);
    });
    taskCmd.command('list').description('List all tasks').option('-l, --list <id>', 'Task list ID (defaults to "tasklist")').option('--pending', 'Show only pending tasks').option('--json', 'Output as JSON').action(async (opts: {
      list?: string;
      pending?: boolean;
      json?: boolean;
    }) => {
      const {
        taskListHandler
      } = await import('./handlers/ant.js');
      await taskListHandler(opts);
    });
    taskCmd.command('get <id>').description('Get details of a task').option('-l, --list <id>', 'Task list ID (defaults to "tasklist")').action(async (id: string, opts: {
      list?: string;
    }) => {
      const {
        taskGetHandler
      } = await import('./handlers/ant.js');
      await taskGetHandler(id, opts);
    });
    taskCmd.command('update <id>').description('Update a task').option('-l, --list <id>', 'Task list ID (defaults to "tasklist")').option('-s, --status <status>', `Set status (${TASK_STATUSES.join(', ')})`).option('--subject <text>', 'Update subject').option('-d, --description <text>', 'Update description').option('--owner <agentId>', 'Set owner').option('--clear-owner', 'Clear owner').action(async (id: string, opts: {
      list?: string;
      status?: string;
      subject?: string;
      description?: string;
      owner?: string;
      clearOwner?: boolean;
    }) => {
      const {
        taskUpdateHandler
      } = await import('./handlers/ant.js');
      await taskUpdateHandler(id, opts);
    });
    taskCmd.command('dir').description('Show the tasks directory path').option('-l, --list <id>', 'Task list ID (defaults to "tasklist")').action(async (opts: {
      list?: string;
    }) => {
      const {
        taskDirHandler
      } = await import('./handlers/ant.js');
      await taskDirHandler(opts);
    });

    // claude completion
    program.command('completion <shell>', {
      hidden: true
    }).description('Generate shell completion script (bash, zsh, or fish)').option('--output <file>', 'Write completion script directly to a file instead of stdout').action(async (shell: string, opts: {
      output?: string;
    }) => {
      const {
        completionHandler
      } = await import('./handlers/ant.js');
      await completionHandler(shell, opts, program);
    });
  }

  profileCheckpoint('register_subcommands_end');
}
