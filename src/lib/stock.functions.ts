import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StockStatus = "in_stock" | "low" | "out";

export type StockItem = {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  low_stock_alert: number;
  cost_price_paise: number;
  selling_price_paise: number;
  thumb_url: string | null;
  status: StockStatus;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  stock_item_id: string;
  item_name: string;
  delta: number;
  reason: "sold" | "restocked" | "damaged" | "returned" | "adjustment";
  note: string | null;
  created_at: string;
};

function statusOf(qty: number, low: number): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= low) return "low";
  return "in_stock";
}

type GenRow = {
  id: string;
  product_name: string | null;
  generated_images: unknown;
  original_image_url: string | null;
};

function thumbFrom(row: GenRow | undefined | null): string | null {
  if (!row) return null;
  const imgs = (row.generated_images ?? []) as Array<{ kind?: string; ratio?: string; url?: string }>;
  return (
    imgs.find((i) => i.kind === "white" && i.ratio === "1:1")?.url ??
    imgs[0]?.url ??
    row.original_image_url ??
    null
  );
}

export const listStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockItem[]> => {
    const sb = context.supabase;
    const { data, error } = await sb
      .from("stock_items")
      .select("id, product_id, name, sku, quantity, low_stock_alert, cost_price_paise, selling_price_paise, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const productIds = rows.map((r) => r.product_id).filter(Boolean) as string[];
    let gens: GenRow[] = [];
    if (productIds.length > 0) {
      const { data: g } = await sb
        .from("generations")
        .select("id, product_name, generated_images, original_image_url")
        .in("id", productIds);
      gens = (g ?? []) as GenRow[];
    }
    const genById = new Map(gens.map((g) => [g.id, g]));
    return rows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      name: r.name,
      sku: r.sku,
      quantity: r.quantity,
      low_stock_alert: r.low_stock_alert,
      cost_price_paise: r.cost_price_paise,
      selling_price_paise: r.selling_price_paise,
      thumb_url: thumbFrom(r.product_id ? genById.get(r.product_id) : null),
      status: statusOf(r.quantity, r.low_stock_alert),
      updated_at: r.updated_at,
    }));
  });

const UpsertSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  sku: z.string().max(60).nullable().optional(),
  quantity: z.number().int().min(0).max(1_000_000),
  low_stock_alert: z.number().int().min(0).max(1_000_000),
  cost_price_paise: z.number().int().min(0).max(100_000_000),
  selling_price_paise: z.number().int().min(0).max(100_000_000),
});

export const upsertStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const sb = context.supabase;
    if (data.id) {
      const { error } = await sb
        .from("stock_items")
        .update({
          name: data.name,
          sku: data.sku ?? null,
          quantity: data.quantity,
          low_stock_alert: data.low_stock_alert,
          cost_price_paise: data.cost_price_paise,
          selling_price_paise: data.selling_price_paise,
          product_id: data.product_id ?? null,
        })
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("stock_items")
      .insert({
        user_id: context.userId,
        name: data.name,
        sku: data.sku ?? null,
        quantity: data.quantity,
        low_stock_alert: data.low_stock_alert,
        cost_price_paise: data.cost_price_paise,
        selling_price_paise: data.selling_price_paise,
        product_id: data.product_id ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "insert failed");
    return { id: row.id };
  });

export const deleteStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("stock_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    stock_item_id: string;
    delta: number;
    reason: "sold" | "restocked" | "damaged" | "returned" | "adjustment";
    note?: string | null;
  }) => d)
  .handler(async ({ context, data }): Promise<{ quantity: number }> => {
    const { data: qty, error } = await context.supabase.rpc("apply_stock_movement", {
      _stock_item_id: data.stock_item_id,
      _delta: data.delta,
      _reason: data.reason,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { quantity: (qty as number) ?? 0 };
  });

export const listMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => d)
  .handler(async ({ context, data }): Promise<StockMovement[]> => {
    const { data: rows, error } = await context.supabase
      .from("stock_movements")
      .select("id, stock_item_id, delta, reason, note, created_at, stock_items!inner(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    type Row = {
      id: string;
      stock_item_id: string;
      delta: number;
      reason: StockMovement["reason"];
      note: string | null;
      created_at: string;
      stock_items: { name: string } | { name: string }[] | null;
    };
    return ((rows ?? []) as Row[]).map((r) => {
      const rel = r.stock_items;
      const name = Array.isArray(rel) ? rel[0]?.name ?? "Item" : rel?.name ?? "Item";
      return {
        id: r.id,
        stock_item_id: r.stock_item_id,
        item_name: name,
        delta: r.delta,
        reason: r.reason,
        note: r.note,
        created_at: r.created_at,
      };
    });
  });
