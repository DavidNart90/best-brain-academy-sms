import type {
  AssetInventoryListQuery,
  assetConditions,
  assetRecordTypes,
  assetStatuses,
} from "./schemas";

export type AssetRecordType = (typeof assetRecordTypes)[number];
export type AssetCondition = (typeof assetConditions)[number];
export type AssetStatus = (typeof assetStatuses)[number];

export type AssetInventoryRecord = {
  id: number;
  recordCode: string;
  recordType: AssetRecordType;
  itemName: string;
  category: string;
  description: string | null;
  quantity: string;
  unitName: string;
  unitCost: string | null;
  reorderLevel: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  schoolLocationId: number | null;
  schoolLocationName: string | null;
  roomOrStore: string | null;
  acquiredOn: string | null;
  supplier: string | null;
  custodian: string | null;
  serialNumber: string | null;
  notes: string | null;
  updatedAt: string;
};

export type AssetInventorySummary = {
  recordCount: number;
  totalQuantity: number;
  activeValue: number;
  attentionCount: number;
  lowStockCount: number;
  nextRecordCode: string;
};

export type AssetInventoryPage = {
  rows: AssetInventoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  query: AssetInventoryListQuery;
  summary: AssetInventorySummary;
  locations: Array<{ id: number; name: string }>;
  editRecord: AssetInventoryRecord | null;
};
