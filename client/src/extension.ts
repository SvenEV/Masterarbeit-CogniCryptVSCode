import * as net from 'net'
import { workspace, ExtensionContext, window, StatusBarAlignment, StatusBarItem, Location, commands, Uri, Selection } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient'
import { handleQuickPickRequest, handleShowTextDocumentNotification, StatusMessage, SimpleTreeDataProvider, handleTreeDataNotification, handleConnectToJavaExtensionRequest } from './protocol'

export let context: ExtensionContext

let client: LanguageClient
let statusBarItem: StatusBarItem
let statusMessage: StatusMessage

export async function activate(extensionContext: ExtensionContext) {
	context = extensionContext

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
	statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 10)
	statusBarItem.command = "cognicrypt.statusDetails"
	statusBarItem.color = "yellow"
	statusBarItem.tooltip = "CogniCrypt"
	context.subscriptions.push(statusBarItem)
	setStatusBarMessage({ text: "Activating CogniCrypt..." })

	// Register commands
	context.subscriptions.push(
		commands.registerCommand("cognicrypt.goto", async (args: Location[]) => {
			try {
				groupBy(args, loc => loc.uri).forEach(async (locations, uri) => {
					const fileUri = Uri.parse(uri.toString())
					const doc = await workspace.openTextDocument(fileUri)
					const editor = await window.showTextDocument(doc, {
						preserveFocus: true
					})
					editor.selections = locations.map(loc => {
						return new Selection(
							loc.range.start.line, loc.range.start.character,
							loc.range.end.line, loc.range.end.character)
					})
				})

			} catch (e) {
				window.showErrorMessage(e)
			}
		}),
		commands.registerCommand("cognicrypt.statusDetails", async _ => {
			const doc = await workspace.openTextDocument({
				content: statusMessage.details,
				language: "markdown"
			})
			await window.showTextDocument(doc)
		}),
		commands.registerCommand("cognicrypt.mvnListDependencies", async _ => {
			const terminal = window.createTerminal("CogniCrypt")
			terminal.show()
			terminal.sendText("mvn dependency:list -DincludeScope=test -o")
		})
	)

	// Setup CogniCrypt viewlet
	const trees = new Map<string, SimpleTreeDataProvider>([
		['cognicrypt.info', new SimpleTreeDataProvider()],
		['cognicrypt.diagnostics', new SimpleTreeDataProvider()]
	])
	trees.forEach((provider, viewId) => window.registerTreeDataProvider(viewId, provider))

	// Create the language client and start it. This will also launch or connect to the server.
	client = new LanguageClient('CogniCrypt', 'CogniCrypt', serverOptions, clientOptions)
	client.start()
	await client.onReady()

	// Subscribe to custom notifications
	client.onNotification("cognicrypt/status", async args => setStatusBarMessage(args))
	client.onNotification("cognicrypt/treeData", handleTreeDataNotification(trees))
	client.onRequest("cognicrypt/quickPick", handleQuickPickRequest)
	client.onNotification("cognicrypt/showTextDocument", handleShowTextDocumentNotification)
	client.onRequest("cognicrypt/connectToJavaExtension", handleConnectToJavaExtensionRequest)
}

function setStatusBarMessage(message: StatusMessage) {
	statusMessage = message
	if (message) {
		statusBarItem.text = "$(lock) " + message.text
		statusBarItem.command = (message.details && message.details !== "") ? "cognicrypt.statusDetails" : null
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

function groupBy<TKey, TValue>(list: TValue[], keySelector: (item: TValue) => TKey) {
    const map = new Map<TKey, TValue[]>();
    list.forEach(item => {
         const key = keySelector(item);
         const collection = map.get(key);
         if (!collection) {
             map.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    return map;
}