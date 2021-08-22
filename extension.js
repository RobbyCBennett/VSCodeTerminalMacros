const vscode = require('vscode');

// vscode.window.showInformationMessage('Info');
// vscode.window.showErrorMessage('Error');

//		Useful keys:
//		\u001b		Escape
//		\u001b[A	Up
//		\01			Select all
//		\03			Stop Process
//		\04			Logout
//		\10			Backspace
//		\13			Clear line before cursor
//		\14			Clear terminal
//		\26			Paste
//		\27			Clear line after cursor

function prepareTerminal(terminal, stop, logout, clear, execute, command) {
	// Clear line
	if (terminal.name == 'cmd' || terminal.name == 'powershell') {
		terminal.sendText('\u001b', false);
	} else {
		terminal.sendText('\13\27', false);
	}

	// Stop
	if (stop) {
		terminal.sendText('\03', false);
	}

	// Logout
	if (logout) {
		terminal.sendText('\04', false);
	}

	// Clear terminal
	if (clear) {
		if (terminal.name == 'cmd') {
			terminal.sendText('cls');
		}
		else {
			terminal.sendText('\14', false);
		}
	}

	// Send command
	terminal.sendText(command, execute);
}

// Install
function activate(context) {
	// Implement commands here, defined in package.json
	commands = vscode.commands.registerCommand('terminalMacros.executeCommand', () => {
		// Get command and options
		vscode.window.showInformationMessage();
		group = 'General';
		name = 'Clear';
		command = '\u001b[A';
		save = true;
		stop = false;
		logout = false;
		clear = true;
		execute = false;
		focus = false; // Buggy when terminal is hidden. Terminal.show(preserveFocus: true) doesn't work

		// Get terminal
		terminal = vscode.window.activeTerminal;
		if (!terminal) {
			terminal = vscode.window.createTerminal();
		}
		terminal.show(!focus);

		// Fix the recent command if using cmd and clearing the terminal
		if (terminal.name == 'cmd' && clear && command == '\u001b[A') {
			command = '\u001b[A\u001b[A';
		}

		// Save and prepare terminal
		if (save) {
			vscode.window.activeTextEditor.document.save().then(() => {
				prepareTerminal(terminal, stop, logout, clear, execute, command);
			});
		} else {
			prepareTerminal(terminal, stop, logout, clear, execute, command);
		}
	});

	context.subscriptions.push(commands);
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
