const vscode = require('vscode');
const path = require('path');

// vscode.window.showInformationMessage('Info');
// vscode.window.showErrorMessage('Error');

codes = {
	escape: '\u001b',
	up: '\u001b[A',
	selectAll: '\01',
	stopProcess: '\03', // control c
	logout: '\04', // control d
	backspace: '\10',
	clearBefore: '\13',
	clearTerminal: '\14',
	paste: '\26',
	clearAfter: '\27'
};

function getCommands() {
	return vscode.workspace.getConfiguration().get('terminalMacros.commands');
}

function getDefault(string) {
	return vscode.workspace.getConfiguration().get('terminalMacros.default.' + string);
}

async function prepareCommand(commandText, terminalName, clear) {
	commandText = commandText.replaceAll('{recent}', codes.up);
	commandText = await commandText.replaceAll('{paste}', await vscode.env.clipboard.readText());
	commandText = commandText.replaceAll('{file}', path.basename(vscode.window.activeTextEditor.document.fileName));

	// Fix for clearing the screen and then getting a recent command in cmd
	if (terminalName == 'cmd' && clear && commandText == codes.up) {
		commandText = codes.up + codes.up;
	}

	return commandText;
}

async function prepareTerminal(terminal, stop, logout, clear, execute, commandText) {
	// Clear line
	if (terminal.name == 'cmd' || terminal.name == 'powershell') {
		terminal.sendText(codes.escape, false);
	} else {
		terminal.sendText(codes.clearBefore + codes.clearAfter, false);
	}

	// Stop
	if (stop) {
		terminal.sendText(codes.stopProcess, false);
	}

	// Logout
	if (logout) {
		terminal.sendText(codes.logout, false);
	}

	// Clear terminal
	if (clear) {
		if (terminal.name == 'cmd') {
			terminal.sendText('cls');
		}
		else {
			terminal.sendText(codes.clearTerminal, false);
		}
	}

	// Prepare command
	commandText = await prepareCommand(commandText, terminal.name, clear);

	// Send command
	terminal.sendText(commandText, execute);
}

async function executeCommand(n) {
	if (n == undefined) {
		vscode.window.showErrorMessage('Your keyboard shortcut in keybindings.json needs the command number argument. Example: "args": 0');
		return;
	}

	// Get command and options
	command = getCommands()[n];
	group = command.group;
	name = command.name;
	commandText = command.command;
	save = command.save;
	show = command.show;
	stop = command.stop;
	logout = command.logout;
	clear = command.clear;
	execute = command.execute;
	focus = command.focus; // Buggy when terminal is hidden. Terminal.show(preserveFocus: true) doesn't work

	// Get terminal
	terminal = vscode.window.activeTerminal;
	if (!terminal) {
		terminal = vscode.window.createTerminal();
	}

	// Show terminal
	if (show) {
		terminal.show(!focus);
	}

	// Prepare command placeholders
	commandText = await prepareCommand(commandText, terminal.name, clear);

	// Save file and prepare terminal
	if (save) {
		vscode.window.activeTextEditor.document.save().then(() => {
			prepareTerminal(terminal, stop, logout, clear, execute, commandText);
		});
	} else {
		prepareTerminal(terminal, stop, logout, clear, execute, commandText);
	}
}

async function listCommands() {
	vscode.window.showInformationMessage('List Commands');
}

// Install
function activate(context) {
	// Implement activationEvents here, defined in package.json
	// activationEvents can have keyboard shortcuts, and commands show up in the  command palette
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.executeCommand', executeCommand));
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.listCommands', listCommands));
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
