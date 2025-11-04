import { supabase } from "./supabase";

export async function saveValuation(
  customerId: string | null,
  analysis: string,
  imageUrls: string[]
) {
  try {
    const customer_id = !customerId || customerId === "_UNKNOWN_" ? null : customerId;

    const payload = {
      customer_id,
      analysis_result: analysis,
      image_urls: imageUrls,
    };

    const { data, error } = await supabase
      .from("valuations")
      .insert([payload])
      .select();

    if (error) {
      console.error("Error saving valuation:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Error saving valuation:", err);
    throw err;
  }
}