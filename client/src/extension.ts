import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// Startup options for the language server
	const serverOptions: ServerOptions = {
		command: "java",
		args: [
			"-Duser.project=E:\\Projects\\Masterarbeit\\CryptoLSPDemo",
			"-jar",
			"E:\\Projects\\Masterarbeit\\CryptoLSPDemo\\target\\crypto-lsp-demo-0.0.1-SNAPSHOT.jar"
		]
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{ scheme: 'file', language: 'java' },
			{ scheme: 'jdt', language: 'java' },
		],
		synchronize: {
			configurationSection: 'java',
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: [ workspace.createFileSystemWatcher('**/*.java') ]
		}
	};

	// Create the language client and start the client. This will also launch the server
	client = new LanguageClient('CogniCrypt', 'CogniCrypt', serverOptions, clientOptions);
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
