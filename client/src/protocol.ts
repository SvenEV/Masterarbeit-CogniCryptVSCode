import { window, Range, workspace, TreeItem, TreeDataProvider, EventEmitter, Event, Uri, ProviderResult, commands, extensions, ViewColumn } from 'vscode'
import { context } from './extension'
import * as path from 'path'
import * as fs from 'fs'

// "cognicrypt/status"

export interface StatusMessage {
	text: string
	details?: string
}

// "cognicrypt/treeData"

export interface PublishTreeDataParams {
	viewId: string
	rootItems: TreeViewNode[]
	focus: boolean
}

export interface TreeViewNode extends TreeItem {
	children: TreeViewNode[]
}

export class SimpleTreeDataProvider implements TreeDataProvider<TreeViewNode> {
	emitter = new EventEmitter<TreeViewNode>()
	onDidChangeTreeData?: Event<TreeViewNode> = this.emitter.event
	rootItems: TreeViewNode[]

	update(rootItems: TreeViewNode[]) {
		this.rootItems = rootItems
		this.emitter.fire()
	}

	getTreeItem(element: TreeViewNode): TreeItem | Thenable<TreeItem> {
		if (typeof element.resourceUri === 'string')
			element.resourceUri = Uri.parse(element.resourceUri)
		if (typeof element.iconPath === 'string' && element.iconPath.startsWith("~"))
			element.iconPath = path.join(__filename, "..", "..", "..", element.iconPath.substr(1))
		return element
	}

	getChildren(element?: TreeViewNode): ProviderResult<TreeViewNode[]> {
		if (element)
			return element.children
		return this.rootItems
	}

	getParent(element: TreeViewNode): ProviderResult<TreeViewNode> {
		function* allElements(parent: TreeViewNode, children: TreeViewNode[]): IterableIterator<{ parent: TreeViewNode, child: TreeViewNode }> {
			for (const child of children) {
				yield { parent, child }
				yield* allElements(child, child.children)
			}
		}

		for (const o of allElements(null, this.rootItems))
			if (o.child === element)
				return o.parent
	}
}

export function handleTreeDataNotification(treeDataProviders: Map<string, SimpleTreeDataProvider>) {
	return (args: PublishTreeDataParams) => {
		const dataProvider = treeDataProviders.get(args.viewId)

		if (dataProvider)
			dataProvider.update(args.rootItems)

		if (args.focus)
			commands.executeCommand(args.viewId + ".focus")
	}
}

// "cognicrypt/quickPick"

export interface QuickPickParams {
	items: string[]
	placeHolder: string
}

export interface QuickPickResult {
	selectedItem?: string
}

export async function handleQuickPickRequest(args: QuickPickParams) {
	const result = await window.showQuickPick(args.items, {
		placeHolder: args.placeHolder,
		canPickMany: false
	})
	return { selectedItem: result }
}

// "cognicrypt/showTextDocument"

export interface ShowTextDocumentParams {
	content: string
	language: string
	selection?: Range
}

export async function handleShowTextDocumentNotification(args: ShowTextDocumentParams) {
	const doc = await workspace.openTextDocument({
		content: args.content,
		language: args.language
	})
	await window.showTextDocument(doc, {
		selection: args.selection
	})
	if (args.language === "dot") {
		if (extensions.getExtension("efanzh.graphviz-preview")) {
			await commands.executeCommand("graphviz.showPreviewToSide")
		} else {
			await window.showInformationMessage("Install the 'Graphviz Preview' extension to view the Graphviz DOT file.")
		}
	}
}

// "cognicrypt/connectToJavaExtension"

export interface ConnectToJavaExtensionResult {
	jdtWorkspacePath: string
}

export async function handleConnectToJavaExtensionRequest(args) {
	const javaExt = extensions.getExtension("redhat.java")

	if (javaExt) {
		await javaExt.activate()
		const jdtDir = path.join(context.storagePath, "..", "redhat.java", "jdt_ws")
		const jdtWorkspaceDir = path.join(jdtDir, fs.readdirSync(jdtDir, 'utf8').find(path => path.startsWith(workspace.name)), "bin")
		return { jdtWorkspacePath: jdtWorkspaceDir }
	}

	return null
}