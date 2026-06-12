import { NOTIFIER_EVENT_TYPES, NOTIFIER_EVENTS } from './constants.shared'

export interface ImageModel {
  id: number
  filePath: string
  fileName: string
  extension: string
  size: number
  createdAt: string
  modifiedAt: string
  lastScanned: string
  thumbnailPath?: string
  width?: number
  height?: number
  hash?: string
  dominantColors?: string[]
  deletedAt?: string
  isDuplicate?: number
  //debug use only
  ai_distance?: number
}

export interface ImageColorModel {
  imageId: number
  r: number
  g: number
  b: number
  h: number
  s: number
  l: number
  rank: number
}

export interface FolderModel {
  id: number
  name: string
  parentId: number | null
  path: string
  createdAt: string
  children?: FolderModel[]
}

export interface TagModel {
  id: number
  name: string
  color?: string
  createdAt: string
  parentId?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    offset: number
    size: number
    total: number
    hasMore: boolean
  }
}

type ExtractNestedValues<T> = T extends string
  ? T
  : T extends object
    ? { [K in keyof T]: ExtractNestedValues<T[K]> }[keyof T]
    : never

export interface Notifier<T> {
  id: ExtractNestedValues<
    (typeof NOTIFIER_EVENTS)[keyof typeof NOTIFIER_EVENTS]
  >
  type: ExtractNestedValues<
    (typeof NOTIFIER_EVENT_TYPES)[keyof typeof NOTIFIER_EVENT_TYPES]
  >
  payload: T
}

export type NotifierEventValues = ExtractNestedValues<
  (typeof NOTIFIER_EVENTS)[keyof typeof NOTIFIER_EVENTS]
>

export interface AppSettingModel {
  keyName: string
  settingValue: string
  valueType: 'string' | 'number' | 'boolean' | 'json' | 'json_array'
  updatedAt: string
}

export type SettingValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SettingValue }
  | SettingValue[]

export type ValueTypeMap = {
  string: string
  number: number
  boolean: boolean
  json: { [key: string]: any }
  json_array: any[]
}

export type InferValueTypeKey<T> = NonNullable<T> extends string
  ? 'string'
  : NonNullable<T> extends number
    ? 'number'
    : NonNullable<T> extends boolean
      ? 'boolean'
      : NonNullable<T> extends any[]
        ? 'json_array'
        : 'json'
