const vscode = require('vscode');

const path = require('node:path');

const CODES = {
	escape:        '\u001b',
	up:            '\u001b[A',
	stopProcess:   '\03', // control c
	logout:        '\04', // control d
	clearBefore:   '\13',
	clearTerminal: '\14',
	paste:         '\26',
	clearAfter:    '\27',
};

//
// Helper Functions
//

function error(message) {
	vscode.window.showErrorMessage(`Terminal Macros: ${message}`);
}

function getConfig() {
	return vscode.workspace.getConfiguration().get('terminalMacros');
}

function windowsToWslPath(fileName) {
	return fileName.split(path.sep).join(path.posix.sep).replace(/^([a-zA-Z]):/, '/mnt/$1');
}

async function formatCommand(commandText, terminalName, clear) {
	// Replace general keywords
	const editor = vscode.window.activeTextEditor;
	commandText = commandText.replaceAll('{recent}', CODES.up);
	if (/{paste}/.test(commandText))
		commandText = await commandText.replaceAll('{paste}', await vscode.env.clipboard.readText());

	// Replace editor keywords
	if (editor) {
		const document = editor.document;
		const fileName = (terminalName != 'wsl') ? document.fileName : windowsToWslPath(document.fileName);
		commandText = commandText.replaceAll('{directory}', path.dirname(fileName));
		commandText = commandText.replaceAll('{file}', path.basename(fileName));
		commandText = commandText.replaceAll('{path}', fileName);
		commandText = commandText.replaceAll('{selection}', document.getText(editor.selection));
	}

	// Fix for clearing the screen and then getting a recent command in cmd
	if (terminalName == 'cmd' && clear && commandText == CODES.up)
		commandText = CODES.up + CODES.up;

	return commandText;
}

function prepareTerminal(terminal, stop, logout, clear, execute, commandText) {
	// Clear line
	if (terminal.name == 'cmd' || terminal.name == 'powershell')
		terminal.sendText(CODES.escape, false);
	else
		terminal.sendText(CODES.clearBefore + CODES.clearAfter, false);

	// Stop process
	if (stop)
		terminal.sendText(CODES.stopProcess);

	// Log out of session
	if (logout)
		terminal.sendText(CODES.logout);

	// Clear terminal
	if (clear) {
		if (terminal.name == 'cmd')
			terminal.sendText('cls');
		else
			terminal.sendText(CODES.clearTerminal, false);
	}
}

//
// Extension Commands
//

async function executeCommand(n, config=undefined) {
	// Get all commands
	if (config == undefined)
		config = getConfig();
	const commands = config.commands;
	const len = commands.length;

	// Error if no command
	if (len == 0)
		return error('settings.json: No commands');
	else if (isNaN(n) || n < 0 || n >= len)
		return error(`keybindings.json: "args": ${n} not command number in range 0 - ${len-1} inclusive`);

	// Get command
	const command = commands[n];
	const group = command.group;
	const name = command.name;
	let commandText = command.command;

	// Error in no command text
	if (commandText == undefined)
		return error('settings.json: "command": "COMMAND_HERE" missing');

	// Get command options
	const defaults = config.default;
	const save = (command.save != undefined) ? command.save : defaults.save;
	const show = (command.show != undefined) ? command.show : defaults.show;
	const stop = (command.stop != undefined) ? command.stop : defaults.stop;
	const logout = (command.logout != undefined) ? command.logout : defaults.logout;
	const clear = (command.clear != undefined) ? command.clear : defaults.clear;
	const execute = (command.execute != undefined) ? command.execute : defaults.execute;
	const focus = (command.focus != undefined) ? command.focus : defaults.focus;
	const terminalName = command.terminal || defaults.terminal;

	// Get terminal
	let terminal;
	// Get specific terminal
	if (terminalName) {
		// Find it
		for (t of vscode.window.terminals) {
			if (t.name == terminalName) {
				terminal = t;
				break;
			}
		}

		// Create it
		if (!terminal)
			terminal = vscode.window.createTerminal({ name: terminalName });
	}
	// Get any terminal
	else {
		// Find it
		terminal = vscode.window.activeTerminal;

		// Create it
		if (!terminal)
			terminal = vscode.window.createTerminal();
	}

	// Show terminal
	if (show)
		terminal.show(!focus);

	// Save file
	if (save && vscode.window.activeTextEditor)
		await vscode.window.activeTextEditor.document.save();

	// Prepare terminal before executing command
	prepareTerminal(terminal, stop, logout, clear, execute, commandText);

	// Prepare command
	commandText = await formatCommand(commandText, terminal.name, clear);

	// Send command
	terminal.sendText(commandText, execute);
}

async function listCommands(currentGroup = undefined) {
	// Get all commands
	const config = getConfig();
	const commands = config.commands;

	// Make a list of QuickPickItem objects
	const groupNames = {};
	const quickPickItems = [];
	for (let n = 0; n < commands.length; n++) {
		const command = commands[n];

		// Add commands
		if (command.group == currentGroup) {
			quickPickItems.push({
				// Command data
				'isCommand': true,
				'n': n,

				// QuickPickItem data
				'label': command.name || command.command,
				'description': (command.name == undefined) ? '': command.command
			});
		}
		// Add groups
		else if (currentGroup == undefined && ! (command.group in groupNames)) {
			quickPickItems.push({
				// Group data
				'isCommand': false,

				// QuickPickItem data
				'label': command.group
			});
			groupNames[command.group] = true;
		}
	}

	// Wait for the user
	const picked = await vscode.window.showQuickPick(quickPickItems);
	if (!picked)
		return;

	// Execute the command
	if (picked.isCommand)
		executeCommand(picked.n, config);
	// Recursively display the groups
	else
		listCommands(picked.label);
}

//
// Basic Extension Functions
//

function activate(context) {
	// Implement activationEvents here, defined in package.json
	// activationEvents can have keyboard shortcuts, and commands show up in the command palette
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.executeCommand', executeCommand));
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.listCommands', listCommands));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
