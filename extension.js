const vscode = require('vscode');
const path = require('path');

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

//
// Helper Functions
//

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

//
// Extension Commands
//

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
	save = command.save || getDefault('save');
	show = command.show || getDefault('show');
	stop = command.stop || getDefault('stop');
	logout = command.logout || getDefault('logout');
	clear = command.clear || getDefault('clear');
	execute = command.execute || getDefault('execute');
	focus = command.focus || getDefault('focus'); // Buggy when terminal is hidden. Terminal.show(preserveFocus: true) doesn't work

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

async function listCommands(currentGroup = undefined) {
	// Get all commands
	commands = getCommands();

	// Make a list of QuickPickItem objects
	groupNames = {};
	quickPickItems = [];
	for (n = 0; n < commands.length; n++) {
		command = commands[n];

		// Add commands
		if (command.group == currentGroup) {
			quickPickItems.push({
				// Command data
				'isCommand': true,
				'n': n,

				// QuickPickItem data
				'label': command.name,
				'description': command.command
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
	picked = await vscode.window.showQuickPick(quickPickItems);

	if (picked) {
		// Execute the command
		if (picked.isCommand) {
			executeCommand(picked.n);
		}
		// Recursively display the groups
		else {
			listCommands(picked.label);
		}
	}
}

// Install
function activate(context) {
	// Implement activationEvents here, defined in package.json
	// activationEvents can have keyboard shortcuts, and commands show up in the command palette
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.executeCommand', executeCommand));
	context.subscriptions.push(vscode.commands.registerCommand('terminalMacros.listCommands', listCommands));
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
