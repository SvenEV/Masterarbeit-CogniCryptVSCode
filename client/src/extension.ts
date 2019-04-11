import {
	workspace,
	ExtensionContext,
	window,
	StatusBarAlignment,
	StatusBarItem,
	Location,
	commands,
	Uri
} from 'vscode'

import * as net from 'net'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	StreamInfo
} from 'vscode-languageclient'

import {
	SimpleTreeDataProvider,
	PublishTreeDataParams
} from './treeview';

let client: LanguageClient
let statusBarItem: StatusBarItem
let statusMessage: StatusMessage

export async function activate(context: ExtensionContext) {
	// Startup options for the language server
	const lspTransport = workspace.getConfiguration().get("cognicrypt.lspTransport", "stdio")

	const serverOptionsStdio = {
		command: "java",
		args: [
			`-Duser.project=${context.extensionPath}/resources`,
			"-jar",
			`${context.extensionPath}/resources/crypto-lsp-demo-0.0.1-SNAPSHOT.jar`
		]
	}

	const serverOptionsSocket = () => {
		const socket = net.connect({ port: 5007 })
		const result: StreamInfo = {
			writer: socket,
			reader: socket
		}
		return new Promise<StreamInfo>((resolve) => {
			socket.on("connect", () => resolve(result))
			socket.on("close", _ =>
				setStatusBarMessage({ text: "Connection to CogniCrypt language server closed." }))
			socket.on("error", _ =>
				window.showErrorMessage(
					"Failed to connect to CogniCrypt language server. Make sure that the language server is running " +
					"-or- configure the extension to connect via standard IO."))
		})
	}

	const serverOptions: ServerOptions =
		(lspTransport === "stdio") ? serverOptionsStdio :
			(lspTransport === "socket") ? serverOptionsSocket : null

	if (!serverOptions)
		throw Error("Unsupported configuration value for 'cognicrypt.lspTransport': " + lspTransport)

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for Java documents
		documentSelector: [
			{ scheme: 'file', language: 'java' },
			{ scheme: 'jdt', language: 'java' },
		],
		synchronize: {
			configurationSection: 'cognicrypt',
			fileEvents: [workspace.createFileSystemWatcher('**/*.java')]
		}
	}

	// Create status bar item
	statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0)
	statusBarItem.command = "cognicrypt/statusDetails"
	statusBarItem.color = "yellow"
	statusBarItem.tooltip = "CogniCrypt"
	context.subscriptions.push(statusBarItem)
	setStatusBarMessage({ text: "Activating CogniCrypt..." })

	// Create the language client and start it. This will also launch or connect to the server.
	client = new LanguageClient('CogniCrypt', 'CogniCrypt', serverOptions, clientOptions)
	client.start()
	await client.onReady()

	// Setup CogniCrypt viewlet
	const treeDiagnostics = new SimpleTreeDataProvider()
	const treeInfo = new SimpleTreeDataProvider()
	window.registerTreeDataProvider('cognicrypt.diagnostics', treeDiagnostics)
	window.registerTreeDataProvider('cognicrypt.info', treeInfo)

	// Subscribe to custom notifications
	client.onNotification("cognicrypt/showCFG", async args => {
		const doc = await workspace.openTextDocument({ language: 'dot', content: args.dotString })
		await window.showTextDocument(doc)
	})

	client.onNotification("cognicrypt/status", async args => {
		setStatusBarMessage(args)
	})

	client.onNotification("cognicrypt/treeData", async (args: PublishTreeDataParams) => {
		switch (args.viewId) {
			case "cognicrypt.diagnostics": treeDiagnostics.update(args.rootItems); break
			case "cognicrypt.info": treeInfo.update(args.rootItems); break
		}
	})

	// Register commands
	commands.registerCommand("cognicrypt/goto", async (args: Location) => {
		try {
			args.uri = Uri.parse(args.uri.toString())
			const doc = await workspace.openTextDocument(args.uri)
			await window.showTextDocument(doc, {
				preserveFocus: true,
				selection: args.range
			})
		} catch (e) {
			window.showErrorMessage(e)
		}
	})

	commands.registerCommand("cognicrypt/statusDetails", async _ => {
		const doc = await workspace.openTextDocument({
			content: statusMessage.details,
			language: "markdown"
		})
		await window.showTextDocument(doc)
	})
}

interface StatusMessage {
	text: string
	details?: string
}

function setStatusBarMessage(message: StatusMessage) {
	statusMessage = message
	if (message) {
		statusBarItem.text = "$(lock) " + message.text
		statusBarItem.command = (message.details && message.details !== "") ? "cognicrypt/statusDetails" : null
		if (message.text && message.text !== "")
			statusBarItem.show()
		else
			statusBarItem.hide()
	} else {
		statusBarItem.hide()
	}
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined
	}
	return client.stop()
}