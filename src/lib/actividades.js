import { supabase } from './supabase'

export async function logActividad(tipo, descripcion, meta = {}) {
  if (!navigator.onLine) return
  try {
    await supabase.from('actividades').insert({ tipo, descripcion, meta })
  } catch {
    // El log nunca debe romper la operacion principal
  }
}
