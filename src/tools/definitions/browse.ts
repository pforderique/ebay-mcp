import { z } from 'zod';
import type { OutputArgs, ToolDefinition } from '../tool-definitions.js';

/** Browse tools for searching public eBay listings via the Finding API. */
export const browseTools: ToolDefinition[] = [
  {
    name: 'ebay_find_completed_items',
    description:
      'Search eBay sold/completed listings using the Finding API. Returns items that actually sold (EndedWithSales). Useful for price research on public sold data without requiring user authentication.',
    inputSchema: {
      keywords: z.string().describe('Search keywords for completed listings'),
      max_results: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      days_back: z
        .number()
        .int()
        .min(1)
        .max(90)
        .optional()
        .describe('How many days back to search for completed listings (default: 90, max: 90)'),
    },
    outputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item_id: { type: 'string' },
              title: { type: 'string' },
              price: { type: 'string' },
              shipping_cost: { type: 'string' },
              sold_date: { type: 'string' },
              condition: { type: 'string' },
              listing_url: { type: 'string' },
            },
          },
        },
        total_found: { type: 'number' },
      },
      description: 'Completed/sold eBay listings matching the search keywords',
    } as OutputArgs,
  },
];
