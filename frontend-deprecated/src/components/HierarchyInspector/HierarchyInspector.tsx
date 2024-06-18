import './HierarchyInspector.css'
import React, { useEffect, useState, useMemo } from 'react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';

function HierarchyInspector({hierarchies, handleChecked}) {
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

    const treeData:DataNode[] = useMemo(() => {
        return [hierarchies]
    }, [hierarchies])


    const onExpand = (expandedKeysValue: React.Key[]) => {
        // console.log('onExpand', expandedKeysValue);
        // if not set autoExpandParent to false, if children expanded, parent can not collapse.
        // or, you can remove all expanded children keys.
        setExpandedKeys(expandedKeysValue);
        setAutoExpandParent(false);
    };

    function onCheck (checkedKeysValue: React.Key[]) {
        console.log('onCheck', checkedKeysValue);
        setCheckedKeys(checkedKeysValue);
        handleChecked(checkedKeysValue)
    };

    const onSelect = (selectedKeysValue: React.Key[], info: any) => {
        // console.log('onSelect', info);
        setSelectedKeys(selectedKeysValue);
    };

    return (
        treeData &&
        <Tree
        checkable
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onCheck={onCheck}
        checkedKeys={checkedKeys}
        onSelect={onSelect}
        selectedKeys={selectedKeys}
        treeData={treeData}
        />
    );
    };

export default HierarchyInspector