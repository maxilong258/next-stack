---
title: "优先队列原理：二叉堆与上浮下沉"
description: "从普通队列到最大堆，搞懂结构性、堆序性，以及上浮与下沉两个核心操作。"
category: "technology"
date: "2026-06-26"
---

# 优先队列原理：二叉堆与上浮下沉

我们可以把优先队列的原理拆解为底层逻辑、核心结构和两大绝活（上浮与下沉）。

## 1. 什么是"优先"队列？

**普通队列**：像排队买奶茶，先来后到（FIFO - 先进先出）。

**优先队列**：像医院的急诊室，不看先来后到，谁的病情最重（优先级最高），谁就先看病。

在"最大优先队列"里，数值越大，优先级越高，每次出队的一定是当前里面最大的那个。

## 2. 核心底层：二叉堆（Binary Heap）

为了让"拿最大值"的速度达到极致，优先队列在底层采用了一种叫二叉堆的树状结构。它满足两个铁律：

### 结构性

它是一棵完全二叉树（除了最后一层，其他层全是满的，且最后一层从左到右紧密排列）。这意味着它可以直接用一个普通的数组来存储，不需要指针连来连去。

如果一个节点的索引是 $i$，那么：

- 它的左子节点索引是 $2i + 1$
- 它的右子节点索引是 $2i + 2$
- 它的父节点索引是 $\lfloor\frac{i - 1}{2}\rfloor$

### 堆序性（最大堆）

任何一个父节点的值，都必须 $\ge$ 它的左右子节点的值。这就保证了整个堆的根节点（即数组的第一项 `data[0]`）永远是全堆最大的那个元素。

## 3. 两个核心操作的"幕后黑手"

如果只是放着不动，拿最大值当然是 $O(1)$。但当我们插入新石头或者拿走最大石头后，堆的平衡会被破坏。这时候就需要两个核心动作来维护秩序：

### 核心一：插入新元素 —— "上浮"（Shift Up）

当我们往堆里放一个新数字时：

1. 先把这个新数字死板地插在数组的最后一位（树的右下角）。
2. 如果这个新数字比它的父节点还要大，就不符合最大堆的规矩了。
3. 让它跟父节点交换位置（上浮），直到它不再比父节点大，或者已经浮到了最顶端（根节点）。

**举个例子**：堆里本来有 `[10, 8, 7]`，现在插进来一个 12。

- 先放在末尾：`[10, 8, 7, 12]`
- 12 的爸爸是 8，12 > 8，交换！变成 `[10, 12, 7, 8]`
- 12 的新爸爸是 10，12 > 10，再交换！变成 `[12, 10, 7, 8]`。搞定！

### 核心二：弹出最大元素 —— "下沉"（Shift Down）

当我们拿走最顶端、最大的那个元素时，顶端就空了。为了填补这个空位：

1. 我们把数组最后一位的那个"小辈"强行挪到最顶端（根节点）。
2. 这时候这个小辈坐在了不属于它的高位上，它必须跟它的两个子节点中较大的那一个去比。
3. 如果它比孩子小，就跟大孩子交换位置（下沉），直到它比左右孩子都大，或者沉到了最底层。

**举个例子**：堆里是 `[12, 10, 7, 8]`。我们要拿走 12。

- 把末尾的 8 挪到堆顶，堆变成 `[8, 10, 7]`（此时违反了最大堆规则）。
- 堆顶的 8 看向它的两个孩子 10 和 7。大的那个是 10。
- 8 比 10 小，必须让位，交换！堆变成 `[10, 8, 7]`。此时符合规则，调整结束！

## 4. 为什么说它高效？

因为这棵树是完全二叉树，树的高度永远是 $\log_2 N$。上浮和下沉最极端的情况，也就是从最底下走到最顶上，或者从最顶上掉到最底下。所以，不管是插入（enqueue）还是弹出（dequeue），它们经历的交换次数最多也就是树的高度。

这就解释了为什么它的时间复杂度是稳定的 $O(\log N)$。你在 LeetCode 调用的 MaxPriorityQueue，不管底层是用 JS 写的还是 C++ 封装的，由于遵循了这套算法逻辑，即便处理海量数据，速度也依然飞快。

```typescript
function lastStoneWeight(stones: number[]): number {
    // 💡 改用我们自己重命名后的 MyMaxHeap
    const heap = new MyMaxHeap(stones);

    while (heap.size() >= 2) {
        const y = heap.pop();
        const x = heap.pop();
        if (x !== y) {
            heap.push(y - x);
        }
    }

    return heap.size() === 0 ? 0 : heap.pop();
}

// 🚀 经典最大堆（Max Heap）实现
class MyMaxHeap {
    // 使用一维数组来存储完全二叉树的节点
    private data: number[] = [];

    constructor(arr: number[] = []) {
        // 浅拷贝传入的初始数组
        this.data = [...arr];
        
        // 💡 原地建堆（Heapify）：从【最后一个非叶子节点】开始，自底向上进行下沉调整
        // 最后一个非叶子节点的索引公式为：Math.floor(length / 2) - 1
        // 这个操作的时间复杂度是高效的 O(N)，比一个一个 push 进堆更优
        for (let i = Math.floor(this.data.length / 2) - 1; i >= 0; i--) {
            this.shiftDown(i);
        }
    }

    // 返回堆中当前元素的总数
    size(): number {
        return this.data.length;
    }

    // 📥 往堆中插入新元素
    push(val: number): void {
        // 1. 先死板地把新元素放到数组的末尾
        this.data.push(val);
        // 2. 因为新加入的元素可能会破坏最大堆的规则，所以需要让它从末尾"上浮"到合适的位置
        this.shiftUp(this.data.length - 1);
    }

    // 📤 弹出并返回堆顶的最大元素（全堆最大值）
    pop(): number {
        if (this.size() === 0) return 0;
        
        // 1. 暂存堆顶（最大值），即数组第一项
        const top = this.data[0];
        // 2. 弹出数组末尾的"小辈"节点
        const bottom = this.data.pop()!;
        
        // 3. 如果弹出后堆还没空，就把刚刚末尾的那个"小辈"强行挪到堆顶坐镇
        if (this.size() > 0) {
            this.data[0] = bottom;
            // 4. 这个小辈坐在高位不符合规则，需要让它从堆顶（索引 0）开始"下沉"
            this.shiftDown(0);
        }
        return top;
    }

    // ⬆️ 上浮操作：维护从下往上的堆序
    private shiftUp(index: number): void {
        // 只要还没浮到根节点（索引 0），就继续看能不能往上走
        while (index > 0) {
            // 计算当前节点的父节点索引：(i - 1) / 2 向下取整
            const parentIndex = Math.floor((index - 1) / 2);
            
            // 如果当前节点已经比父节点小了，符合最大堆规则，大功告成，退出
            if (this.data[index] <= this.data[parentIndex]) break;
            
            // 否则，跟父节点交换位置
            this.swap(index, parentIndex);
            // 自己的索引变成了父节点的索引，继续下一轮向上比对
            index = parentIndex;
        }
    }

    // ⬇️ 下沉操作：维护从上往下的堆序
    private shiftDown(index: number): void {
        const len = this.data.length;
        
        // 只要当前节点【有左子节点】，就说明它不是叶子节点，还可以继续往下沉
        // 左子节点索引：2 * i + 1
        while (index * 2 + 1 < len) {
            let maxChildIndex = index * 2 + 1; // 先假设左子节点是两个孩子中较大的那个
            const rightChildIndex = index * 2 + 2; // 右子节点索引：2 * i + 2

            // 如果右子节点存在，并且右子节点的值比左子节点还要大
            if (rightChildIndex < len && this.data[rightChildIndex] > this.data[maxChildIndex]) {
                maxChildIndex = rightChildIndex; // 那就把较大孩子的头衔交给右子节点
            }

            // 如果当前节点本身已经大于等于最大孩子的值了，说明不用再沉了，退出
            if (this.data[index] >= this.data[maxChildIndex]) break;
            
            // 否则，跟较大的那个孩子交换位置（让大孩子上位）
            this.swap(index, maxChildIndex);
            // 自己的索引变成了更新后的孩子索引，继续去下一层比对
            index = maxChildIndex;
        }
    }

    // 🔄 辅助函数：交换数组中两个指定索引的元素
    private swap(i: number, j: number): void {
        const temp = this.data[i];
        this.data[i] = this.data[j];
        this.data[j] = temp;
    }
}
```

[LeetCode 1046. 最后一块石头的重量](https://leetcode.cn/problems/last-stone-weight/description/)
