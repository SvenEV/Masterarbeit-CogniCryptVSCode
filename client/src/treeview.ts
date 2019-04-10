import { TreeDataProvider, EventEmitter, Event, TreeItem } from 'vscode';

export interface PublishTreeDataParams {
	viewId: string
	rootItems: TreeViewNode[]
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
		return element
	}
	
	getChildren(element?: TreeViewNode): import("vscode").ProviderResult<TreeViewNode[]> {
		if (element)
			return element.children
		return this.rootItems
	}
}