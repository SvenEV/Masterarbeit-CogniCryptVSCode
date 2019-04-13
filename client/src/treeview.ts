import { TreeDataProvider, EventEmitter, Event, TreeItem, Uri, ProviderResult, TreeView } from 'vscode';

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
		return element
	}
	
	getChildren(element?: TreeViewNode): ProviderResult<TreeViewNode[]> {
		if (element)
			return element.children
		return this.rootItems
	}

	getParent(element: TreeViewNode): ProviderResult<TreeViewNode> {
		function* allElements(parent: TreeViewNode, children: TreeViewNode[]): IterableIterator<{ parent: TreeViewNode, child: TreeViewNode}> {
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