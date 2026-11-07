export const BASE_FIELDS = {
  entity: ['id', 'entity_id', 'name', 'code', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'creditLimit', 'paymentTerms', 'createdAt', 'updatedAt'],
  document: ['id', 'entity_id', 'series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'paymentTerms', 'notes', 'status', 'createdAt', 'updatedAt']
};

export const FIELD_TYPES = ['text', 'number', 'date', 'select'];

export const DEFAULT_CONFIG = {
  moduleName: 'Módulo Base ERP',
  labels: {
    entity: 'Entidad', entities: 'Entidades',
    document: 'Documento', documents: 'Documentos',
    employee: 'Empleado', employees: 'Empleados',
    category: 'Categoría', categories: 'Categorías',
    product: 'Producto', products: 'Productos',
    purchaseOrderLine: 'Detalle', purchaseOrderLines: 'Detalles'
  },
  customFields: [],
  statusLifecycle: null,
  theme: { accentColor: '#2563eb' }
};

export const PURCHASING_CONFIG = {
  moduleName: 'Adquisiciones y Compras',
  labels: {
    entity: 'Proveedor', entities: 'Proveedores',
    document: 'Orden de Compra', documents: 'Órdenes de Compra',
    employee: 'Empleado', employees: 'Empleados',
    category: 'Categoría', categories: 'Categorías',
    product: 'Producto', products: 'Productos',
    purchaseOrderLine: 'Detalle de compra', purchaseOrderLines: 'Detalles de compra'
  },
  customFields: [],
  statusLifecycle: {
    statuses: ['borrador', 'pendiente', 'aprobado', 'recibido', 'cancelado'],
    transitions: {
      borrador: ['pendiente', 'cancelado'],
      pendiente: ['aprobado', 'cancelado'],
      aprobado: ['recibido'],
      recibido: [],
      cancelado: []
    }
  },
  theme: { accentColor: '#2563eb' }
};

export let userConfig = null;
let activeConfig = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isHexColor(value) {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function normalizeConfig(input) {
  if (input === null || input === undefined) {
    return { config: clone(DEFAULT_CONFIG), errors: [] };
  }

  const errors = [];
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { config: clone(DEFAULT_CONFIG), errors: ['La configuración debe ser un objeto válido'] };
  }

  const config = clone(DEFAULT_CONFIG);
  if (input.moduleName !== undefined) {
    if (typeof input.moduleName !== 'string' || !input.moduleName.trim()) {
      errors.push('moduleName debe ser un nombre no vacío');
    } else {
      config.moduleName = input.moduleName.trim();
    }
  }

  if (input.labels !== undefined) {
    if (typeof input.labels !== 'object' || Array.isArray(input.labels)) {
      errors.push('labels debe ser un objeto');
    } else {
      for (const [key, value] of Object.entries(input.labels)) {
        if (key in config.labels && typeof value === 'string' && value.trim()) {
          config.labels[key] = value.trim();
        }
      }
    }
  }

  config.customFields = [];
  if (input.customFields !== undefined) {
    if (!Array.isArray(input.customFields)) {
      errors.push('customFields debe ser un arreglo');
    } else {
      const seen = { entity: new Set(), document: new Set() };
      for (const field of input.customFields) {
        if (!field || typeof field !== 'object') {
          errors.push('Campo personalizado inválido');
          continue;
        }
        if (!['entity', 'document'].includes(field.target)) {
          errors.push('customFields.target debe ser entity o document');
          continue;
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field.key || '') || BASE_FIELDS[field.target].includes(field.key)) {
          errors.push(`La clave ${field.key || ''} choca con un campo base o es inválida`);
          continue;
        }
        if (!FIELD_TYPES.includes(field.type)) {
          errors.push(`customFields.type "${field.type}" no es válido`);
          continue;
        }
        if (!field.label || typeof field.label !== 'string') {
          errors.push('customFields.label debe ser un texto');
          continue;
        }
        if (field.type === 'select' && (!Array.isArray(field.options) || field.options.length === 0)) {
          errors.push(`customFields.options es obligatoria para el campo select "${field.key}"`);
          continue;
        }
        if (seen[field.target].has(field.key)) {
          errors.push(`La clave personalizada "${field.key}" aparece más de una vez`);
          continue;
        }
        seen[field.target].add(field.key);
        config.customFields.push({
          target: field.target,
          key: field.key,
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          ...(field.type === 'select' ? { options: [...field.options] } : {})
        });
      }
    }
  }

  config.statusLifecycle = null;
  if (input.statusLifecycle !== undefined && input.statusLifecycle !== null) {
    const lifecycle = input.statusLifecycle;
    if (!lifecycle || !Array.isArray(lifecycle.statuses) || typeof lifecycle.transitions !== 'object') {
      errors.push('statusLifecycle debe tener statuses y transitions');
    } else {
      const statuses = new Set(lifecycle.statuses);
      for (const status of lifecycle.statuses) {
        if (!Object.prototype.hasOwnProperty.call(lifecycle.transitions, status)) continue;
        for (const next of lifecycle.transitions[status] || []) {
          if (!statuses.has(next)) errors.push(`La transición de "${status}" referencia un estado desconocido: "${next}"`);
        }
      }
      if (!errors.some(error => error.includes('estado desconocido'))) {
        config.statusLifecycle = {
          statuses: [...lifecycle.statuses],
          transitions: { ...lifecycle.transitions }
        };
      }
    }
  }

  if (input.theme !== undefined) {
    if (typeof input.theme !== 'object' || Array.isArray(input.theme)) {
      errors.push('theme debe ser un objeto');
    } else if (input.theme.accentColor !== undefined) {
      if (!isHexColor(input.theme.accentColor)) {
        errors.push('theme.accentColor debe ser un color hexadecimal válido');
      } else {
        config.theme.accentColor = input.theme.accentColor;
      }
    }
  }

  if (errors.length) {
    return { config, errors };
  }
  return { config, errors };
}

export async function loadModuleConfig() {
  if (!userConfig) {
    return normalizeConfig(PURCHASING_CONFIG);
  }
  const result = normalizeConfig(userConfig);
  if (result.errors.length) {
    return {
      config: normalizeConfig(PURCHASING_CONFIG).config,
      errors: result.errors
    };
  }
  return result;
}

export function setActiveConfig(configOrResult) {
  if (configOrResult && configOrResult.config) activeConfig = configOrResult.config;
  else activeConfig = configOrResult ? configOrResult : null;
}

export function getConfig() {
  if (!activeConfig) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...activeConfig,
    labels: { ...DEFAULT_CONFIG.labels, ...(activeConfig.labels || {}) },
    customFields: Array.isArray(activeConfig.customFields) ? activeConfig.customFields : [],
    theme: { ...DEFAULT_CONFIG.theme, ...(activeConfig.theme || {}) }
  };
}

export function labelFor(key) {
  return getConfig().labels[key] || key;
}
