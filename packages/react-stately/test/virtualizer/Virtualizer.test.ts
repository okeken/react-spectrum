/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {InvalidationContext} from '../../src/virtualizer/types';
import {Key, Node} from '@react-types/shared';
import {ListLayout} from '../../src/layout/ListLayout';
import {Rect} from '../../src/virtualizer/Rect';
import {Size} from '../../src/virtualizer/Size';
import {Virtualizer} from '../../src/virtualizer/Virtualizer';

function createCollection(itemCount: number) {
  let items = Array.from(
    {length: itemCount},
    (_, i) =>
      ({
        type: 'item',
        key: `item-${i}`,
        index: i,
        level: 0,
        parentKey: null,
        hasChildNodes: false,
        childNodes: [],
        props: {}
      }) as unknown as Node<unknown>
  );

  return {
    size: items.length,
    getItem: (key: Key) => items.find(item => item.key === key) ?? null,
    getKeys: () => items.map(item => item.key),
    getFirstKey: () => items[0]?.key ?? null,
    getLastKey: () => items.at(-1)?.key ?? null,
    getKeyBefore: () => null,
    getKeyAfter: () => null,
    [Symbol.iterator]: () => items[Symbol.iterator]()
  } as any;
}

describe('Virtualizer', () => {
  it('keeps the content size in sync with the layout when the scroll view is sized by its content', () => {
    let itemCount = 60;
    let estimatedRowHeight = 50;
    let measuredRowHeight = 90;
    let viewportHeight = 200;
    let width = 400;

    let collection = createCollection(itemCount);
    let layout = new ListLayout<Node<unknown>>();
    let layoutOptions = {estimatedRowHeight};
    let invalidationContext: InvalidationContext = {layoutOptions};
    let virtualizer = new Virtualizer<Node<unknown>, null>({
      collection,
      layout,
      delegate: {
        setVisibleRect: () => {},
        renderView: () => null,
        invalidate: context => {
          invalidationContext = {...context, layoutOptions};
        }
      }
    });

    let size = new Size(width, viewportHeight);
    let render = (scrollY: number) => {
      virtualizer.render({
        layout,
        collection,
        size,
        visibleRect: new Rect(0, scrollY, width, Math.min(viewportHeight, size.height - scrollY)),
        invalidationContext,
        isScrolling: false
      });
      expect(virtualizer.contentSize.height).toBe(layout.getContentSize().height);
    };

    let measured = new Set<Key>();
    let maxScrollY = itemCount * measuredRowHeight - viewportHeight;
    for (let scrollY = 0; scrollY <= maxScrollY; scrollY += 120) {
      render(scrollY);

      for (let [key, layoutInfo] of virtualizer.getVisibleLayoutInfos()) {
        if (layoutInfo.type === 'item' && !measured.has(key)) {
          measured.add(key);
          virtualizer.updateItemSize(key, new Size(width, measuredRowHeight));
        }
      }
      render(scrollY);

      // The scroll view grows with its content.
      size = new Size(width, virtualizer.contentSize.height);
      render(scrollY);
    }

    expect(measured.size).toBe(itemCount);
    expect(virtualizer.contentSize.height).toBe(itemCount * measuredRowHeight);
  });
});
