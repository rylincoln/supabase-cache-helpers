import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';

import { useCursorInfiniteScrollQuery } from '../../src';
import type { Database } from '../database.types';
import { renderWithConfig } from '../utils';

const TEST_PREFIX = 'postgrest-swr-infinite-scroll';

describe('useCursorInfiniteScrollQuery', () => {
  let client: SupabaseClient<Database>;
  let provider: Map<any, any>;
  let testRunPrefix: string;
  let contacts: Database['public']['Tables']['contact']['Row'][];

  beforeAll(async () => {
    testRunPrefix = `${TEST_PREFIX}-${Math.floor(Math.random() * 100)}`;
    client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string
    );
    await client.from('contact').delete().ilike('username', `${TEST_PREFIX}%`);

    const { data } = await client
      .from('contact')
      .insert([
        { username: `${testRunPrefix}-username-1` },
        { username: `${testRunPrefix}-username-2` },
        { username: `${testRunPrefix}-username-3` },
        { username: `${testRunPrefix}-username-4` },
      ])
      .select('*')
      .throwOnError();
    contacts = data ?? [];
    expect(contacts).toHaveLength(4);
  });

  beforeEach(() => {
    provider = new Map();
  });

  it('should load correctly', async () => {
    function Page() {
      const { data, loadMore, isValidating, error } =
        useCursorInfiniteScrollQuery(
          client
            .from('contact')
            .select('id,username')
            .ilike('username', `${testRunPrefix}%`)
            .order('username', { ascending: true })
            .limit(1),
          { path: 'username' },
          { revalidateOnFocus: false }
        );

      return (
        <div>
          {loadMore && (
            <div data-testid="loadMore" onClick={() => loadMore()} />
          )}
          <div data-testid="list">
            {(data ?? []).map((p) => (
              <div key={p.id}>{p.username}</div>
            ))}
          </div>
        </div>
      );
    }

    renderWithConfig(<Page />, { provider: () => provider });
    await screen.findByText(
      `${testRunPrefix}-username-1`,
      {},
      { timeout: 10000 }
    );
    const list = screen.getByTestId('list');
    expect(list.childElementCount).toEqual(1);

    fireEvent.click(
      await screen.findByTestId('loadMore', {}, { timeout: 10000 })
    );
    await screen.findByText(
      `${testRunPrefix}-username-2`,
      {},
      { timeout: 10000 }
    );

    expect(list.childElementCount).toEqual(2);

    fireEvent.click(screen.getByTestId('loadMore'));
    await screen.findByText(
      `${testRunPrefix}-username-3`,
      {},
      { timeout: 10000 }
    );

    expect(list.childElementCount).toEqual(3);
  });

  it('should stop at lastCursor', async () => {
    function Page() {
      const { data, loadMore, isValidating, error } =
        useCursorInfiniteScrollQuery(
          client
            .from('contact')
            .select('id,username')
            .ilike('username', `${testRunPrefix}%`)
            .order('username', { ascending: true })
            .limit(1),
          {
            path: 'username',
            until: `${testRunPrefix}-username-2`,
          }
        );

      return (
        <div>
          {loadMore && (
            <div data-testid="loadMore" onClick={() => loadMore()} />
          )}
          <div data-testid="list">
            {(data ?? []).map((p) => (
              <div key={p.id}>{p.username}</div>
            ))}
          </div>
        </div>
      );
    }

    renderWithConfig(<Page />, { provider: () => provider });
    await screen.findByText(
      `${testRunPrefix}-username-1`,
      {},
      { timeout: 10000 }
    );
    const list = screen.getByTestId('list');
    expect(list.childElementCount).toEqual(1);

    fireEvent.click(screen.getByTestId('loadMore'));
    await screen.findByText(
      `${testRunPrefix}-username-2`,
      {},
      { timeout: 10000 }
    );

    expect(list.childElementCount).toEqual(2);

    expect(screen.queryByTestId('loadMore')).toBeNull();
  });

  it('should allow conditional queries', async () => {
    function Page() {
      const [condition, setCondition] = useState(false);
      const { data, isLoading, error } = useCursorInfiniteScrollQuery(
        condition
          ? client
              .from('contact')
              .select('id,username')
              .ilike('username', `${testRunPrefix}%`)
              .order('username', { ascending: true })
              .limit(1)
          : null,
        { path: 'username' }
      );

      return (
        <div>
          <div data-testid="setCondition" onClick={() => setCondition(true)} />
          <div data-testid="pages">
            {(data ?? [])[0]?.username ?? 'undefined'}
          </div>
          <div>{`isLoading: ${isLoading}`}</div>
        </div>
      );
    }

    renderWithConfig(<Page />, { provider: () => provider });
    await screen.findByText('isLoading: false', {}, { timeout: 10000 });
    await screen.findByText('undefined', {}, { timeout: 10000 });
    fireEvent.click(screen.getByTestId('setCondition'));
    await screen.findByText(
      `${testRunPrefix}-username-1`,
      {},
      { timeout: 10000 }
    );
  });

  it('should stop if no more data', async () => {
    function Page() {
      const { data, loadMore, isValidating, error } =
        useCursorInfiniteScrollQuery(
          client
            .from('contact')
            .select('id,username')
            .ilike('username', `${testRunPrefix}%`)
            .order('username', { ascending: true })
            .limit(2),
          {
            path: 'username',
          }
        );

      return (
        <div>
          {loadMore && (
            <div data-testid="loadMore" onClick={() => loadMore()} />
          )}
          <div data-testid="isValidating">{`isValidating: ${isValidating}`}</div>
          <div data-testid="list">
            {(data ?? []).map((p) => (
              <div key={p.id}>{p.username}</div>
            ))}
          </div>
        </div>
      );
    }

    renderWithConfig(<Page />, { provider: () => provider });
    const list = screen.getByTestId('list');

    await screen.findByText(
      `${testRunPrefix}-username-1`,
      {},
      { timeout: 10000 }
    );
    await screen.findByText(
      `${testRunPrefix}-username-2`,
      {},
      { timeout: 10000 }
    );
    expect(list.childElementCount).toEqual(2);

    fireEvent.click(screen.getByTestId('loadMore'));
    await screen.findByText(
      `${testRunPrefix}-username-3`,
      {},
      { timeout: 10000 }
    );
    await screen.findByText(
      `${testRunPrefix}-username-4`,
      {},
      { timeout: 10000 }
    );
    expect(list.childElementCount).toEqual(4);

    await screen.findByText('isValidating: false', {}, { timeout: 10000 });

    fireEvent.click(screen.getByTestId('loadMore'));

    await screen.findByText('isValidating: false', {}, { timeout: 10000 });

    expect(list.childElementCount).toEqual(4);

    expect(screen.queryByTestId('loadMore')).toBeNull();
  });
});