import { PostgrestMutatorOpts } from '@supabase-cache-helpers/postgrest-mutate';
import { GetResult } from '@supabase/postgrest-js/dist/module/select-query-parser';
import {
  GenericSchema,
  GenericTable,
} from '@supabase/postgrest-js/dist/module/types';
import { PostgrestError } from '@supabase/supabase-js';
import { MutatorOptions as SWRMutatorOptions } from 'swr';
import { Options as UseMutationOptions } from 'use-mutation';

export type { UseMutationOptions, PostgrestError };

export type Operation = 'Insert' | 'UpdateOne' | 'Upsert' | 'DeleteOne';

export type GetInputType<
  T extends GenericTable,
  O extends Operation
> = O extends 'DeleteOne'
  ? Partial<T['Row']> // TODO: Can we pick the primary keys somehow?
  : O extends 'Insert' | 'Upsert'
  ? T['Insert'] | T['Insert'][]
  : O extends 'UpdateOne'
  ? T['Update']
  : never;

export type GetReturnType<R, O extends Operation> = O extends
  | 'UpdateOne'
  | 'DeleteOne'
  ? R
  : O extends 'Insert' | 'Upsert'
  ? R[]
  : never;

export type UsePostgrestSWRMutationOpts<
  S extends GenericSchema,
  T extends GenericTable,
  O extends Operation,
  Q extends string = '*',
  R = GetResult<S, T['Row'], Q extends '*' ? '*' : Q>
> = PostgrestMutatorOpts<T['Row']> &
  SWRMutatorOptions &
  UseMutationOptions<
    GetInputType<T, O>,
    GetReturnType<R, O> | null,
    PostgrestError
  >;
