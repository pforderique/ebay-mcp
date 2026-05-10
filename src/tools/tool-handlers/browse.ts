import type { ToolHandlerMap } from './types.js';

const FINDING_API_ENDPOINT = 'https://svcs.ebay.com/services/search/FindingService/v1';

interface FindingApiItem {
  itemId?: string[];
  title?: string[];
  viewItemURL?: string[];
  condition?: { conditionDisplayName?: string[] }[];
  sellingStatus?: {
    currentPrice?: { __value__?: string; '@currencyId'?: string }[];
    sellingState?: string[];
  }[];
  shippingInfo?: {
    shippingServiceCost?: { __value__?: string; '@currencyId'?: string }[];
  }[];
  listingInfo?: { endTime?: string[] }[];
}

interface FindingApiResponse {
  findCompletedItemsResponse?: {
    searchResult?: {
      item?: FindingApiItem[];
      '@count'?: string;
    }[];
    paginationOutput?: { totalEntries?: string[] }[];
  }[];
}

/** Handler map for Finding API browse tools. */
export const browseHandlers: ToolHandlerMap = {
  ebay_find_completed_items: async (_api, args) => {
    const keywords = args.keywords as string;
    const maxResults = (args.max_results as number | undefined) ?? 20;
    const daysBack = Math.min((args.days_back as number | undefined) ?? 90, 90);

    const appId = process.env.EBAY_CLIENT_ID;
    if (!appId) {
      throw new Error('EBAY_CLIENT_ID environment variable is not set');
    }

    const endTimeFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      keywords,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'EndTimeFrom',
      'itemFilter(1).value': endTimeFrom,
      'paginationInput.entriesPerPage': String(maxResults),
      RESPONSE_DATA_FORMAT: 'JSON',
    });

    const url = `${FINDING_API_ENDPOINT}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'X-EBAY-SOA-SECURITY-APPNAME': appId,
        'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
        'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
        'X-EBAY-SOA-SERVICE-VERSION': '1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Finding API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as FindingApiResponse;

    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
    const rawItems: FindingApiItem[] = searchResult?.item ?? [];
    const totalEntries = Number(
      data.findCompletedItemsResponse?.[0]?.paginationOutput?.[0]?.totalEntries?.[0] ?? 0
    );

    const items = rawItems
      .filter((item) => item.sellingStatus?.[0]?.sellingState?.[0] === 'EndedWithSales')
      .map((item) => {
        const priceObj = item.sellingStatus?.[0]?.currentPrice?.[0];
        const shippingObj = item.shippingInfo?.[0]?.shippingServiceCost?.[0];
        const currency = priceObj?.['@currencyId'] ?? 'USD';
        const shippingCurrency = shippingObj?.['@currencyId'] ?? currency;

        return {
          item_id: item.itemId?.[0] ?? '',
          title: item.title?.[0] ?? '',
          price: priceObj?.__value__ ? `${priceObj.__value__} ${currency}` : 'N/A',
          shipping_cost: shippingObj?.__value__
            ? `${shippingObj.__value__} ${shippingCurrency}`
            : 'N/A',
          sold_date: item.listingInfo?.[0]?.endTime?.[0] ?? '',
          condition: item.condition?.[0]?.conditionDisplayName?.[0] ?? 'Unknown',
          listing_url: item.viewItemURL?.[0] ?? '',
        };
      });

    return { items, total_found: totalEntries };
  },
};
