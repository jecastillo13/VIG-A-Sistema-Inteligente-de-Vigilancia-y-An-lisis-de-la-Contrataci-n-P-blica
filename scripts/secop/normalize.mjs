function text(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function number(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function date(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

export function normalizeContract(row) {
  const id = text(row.id_contrato);
  if (!id) return { ok: false, reason: 'missing_contract_id' };
  const signedAt = date(row.fecha_de_firma);
  if (!signedAt) return { ok: false, reason: 'invalid_signature_date', id };
  const value = number(row.valor_del_contrato);
  if (value === null || value < 0) return { ok: false, reason: 'invalid_contract_value', id };

  return {
    ok: true,
    value: {
      id,
      processId: text(row.proceso_de_compra),
      reference: text(row.referencia_del_contrato),
      status: text(row.estado_contrato),
      description: text(row.objeto_del_contrato || row.descripcion_del_proceso),
      contractType: text(row.tipo_de_contrato),
      procurementMethod: text(row.modalidad_de_contratacion),
      procurementMethodJustification: text(row.justificacion_modalidad_de),
      signedAt,
      startsAt: date(row.fecha_de_inicio_del_contrato),
      endsAt: date(row.fecha_de_fin_del_contrato),
      value,
      addedDays: number(row.dias_adicionados) ?? 0,
      mainCategoryCode: text(row.codigo_de_categoria_principal),
      entity: {
        code: text(row.codigo_entidad),
        taxId: text(row.nit_entidad),
        name: text(row.nombre_entidad),
        department: text(row.departamento),
        city: text(row.ciudad),
        order: text(row.orden),
        sector: text(row.sector),
      },
      supplier: {
        code: text(row.codigo_proveedor),
        name: text(row.proveedor_adjudicado),
        isGroup: text(row.es_grupo) === 'Si',
        isSme: text(row.es_pyme) === 'Si',
      },
      source: {
        datasetId: 'jbjy-vk9h',
        processUrl: text(row.urlproceso?.url || row.urlproceso),
        updatedAt: date(row.ultima_actualizacion),
      },
    },
  };
}

