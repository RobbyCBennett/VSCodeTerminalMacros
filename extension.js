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

const TERMINALS = {
	cmd:        1,
	powershell: 2,
	wsl:        3,
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

async function formatCommand(commandText, clear, execute, specialTerminal) {
	// Replace {recent} format specifier and do nothing else
	if (/{recent}/.test(commandText)) {
		commandText = CODES.up;

		// Fix for clearing the screen and then getting a recent command in cmd
		if (specialTerminal == TERMINALS.cmd && clear && execute)
			commandText += CODES.up;

		return commandText;
	}

	// Replace {paste} format specifier using the clipboard
	commandText = await commandText.replaceAll('{paste}', await vscode.env.clipboard.readText());

	// Replace format specifiers for the editor
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const document = editor.document;
		let fileName = document.fileName;

		// Fix for WSL path
		if (specialTerminal == TERMINALS.wsl)
			fileName = windowsToWslPath(fileName);

		commandText = commandText.replaceAll('{directory}', path.dirname(fileName));
		commandText = commandText.replaceAll('{file}', path.basename(fileName));
		commandText = commandText.replaceAll('{path}', fileName);
		commandText = commandText.replaceAll('{selection}', document.getText(editor.selection));
	}

	return commandText;
}

async function prepareTerminal(terminal, stop, logout, clear, specialTerminal) {
	// Clear line
	if (specialTerminal == TERMINALS.cmd || specialTerminal == TERMINALS.powershell)
		terminal.sendText(CODES.escape, false);
	else
		terminal.sendText(CODES.clearBefore + CODES.clearAfter, false);

	// Stop process
	if (stop)
		terminal.sendText(CODES.stopProcess, false);

	// Log out of session
	if (logout)
		terminal.sendText(CODES.logout, false);

	// Clear terminal
	if (clear) {
		// Clear previous content on screen
		await vscode.commands.executeCommand('workbench.action.terminal.clear');

		// Clear control codes on screen
		if (specialTerminal == TERMINALS.cmd)
			terminal.sendText('cls');
		else
			terminal.sendText(CODES.clearTerminal, false);
	}
}

function getSpecialTerminalEnum(terminal) {
	if (path.extname(terminal.creationOptions.shellPath) != '.exe')
		return;

	const name = path.parse(terminal.creationOptions.shellPath).name;
	return TERMINALS[name];
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
		for (existingTerminal of vscode.window.terminals) {
			if (existingTerminal.name == terminalName) {
				terminal = existingTerminal;
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

	const specialTerminal = getSpecialTerminalEnum(terminal);

	// Prepare terminal before executing command
	await prepareTerminal(terminal, stop, logout, clear, specialTerminal);

	// Prepare command
	commandText = await formatCommand(commandText, clear, execute, specialTerminal);

	// Fix for powershell consuming input while stopping
	const wait = specialTerminal == TERMINALS.powershell && stop;

	// Send command
	setTimeout(function() {
		terminal.sendText(commandText, execute);
	}, wait ? 5 : 0);
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
	context.subscriptions.push(
		vscode.commands.registerCommand('terminalMacros.executeCommand', executeCommand),
		vscode.commands.registerCommand('terminalMacros.listCommands', listCommands),
	);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
