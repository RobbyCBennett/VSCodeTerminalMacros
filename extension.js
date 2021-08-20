const vscode = require('vscode');

// Install
function activate(context) {
	// Implement commands from package.json
	let disposable = vscode.commands.registerCommand('terminal-macros.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from Terminal Macros!');
	});

	context.subscriptions.push(disposable);
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
