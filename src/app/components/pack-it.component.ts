import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, computed, effect, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type Modo = 'viaje' | 'mudanza';
type Duracion = '1-3' | '4-7' | '8+';
type Lang = 'es' | 'en';

type Contexto =
    | 'playa' | 'ciudad' | 'frio' | 'trabajo' | 'lluvia' | 'montana' | 'camping'
    | 'evento' | 'negocios' | 'internacional' | 'avion' | 'inviernoExtremo' | 'formal';

type Extra = 'laptop' | 'gym' | 'kids' | 'mascota' | 'medicacion' | 'coche' | 'foto' | 'bebe' | 'playaPlus';

type Categoria =
    | 'Documentos'
    | 'Ropa'
    | 'Higiene'
    | 'Tecnología'
    | 'Salud'
    | 'Comida'
    | 'Extras'
    | 'Mudanza';

type Item = {
    id: string;

    /**
     * Si key existe => es una key i18n ("ITEMS.DNI_PASSPORT", etc.)
     * Si key NO existe => texto libre (ej: ítem agregado a mano)
     */
    texto: string;
    key?: string;

    hecho: boolean;
    categoria: Categoria;
    cantidad?: number;
};

type State = {
    modo: Modo;
    duracion: Duracion;
    contextos: Contexto[];
    extras: Extra[];
    items: Item[];
    // si querés persistir idioma más adelante:
    // lang?: Lang;
};

const STORAGE_KEY = 'packit:v1';
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

@Component({
    selector: 'app-pack-it',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './pack-it.component.html',
})
export class PackItComponent {
    constructor(@Inject(PLATFORM_ID) private platformId: Object, private translate: TranslateService) {
        this.initTheme();

        const initial = (isPlatformBrowser(this.platformId)
            ? (localStorage.getItem('lang') as 'es' | 'en' | null)
            : null) ?? 'es';

        this.lang.set(initial);
        this.translate.setDefaultLang('es');
        this.translate.use(initial);
        // Cargar estado (solo browser)
        if (isPlatformBrowser(this.platformId)) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw) as State;
                    this.modo.set(parsed.modo ?? 'viaje');
                    this.duracion.set(parsed.duracion ?? '1-3');
                    this.contextos.set(parsed.contextos ?? []);
                    this.extras.set(parsed.extras ?? []);
                    this.items.set(parsed.items ?? []);
                } catch {
                    // ignore
                }
            }
        }

        // Persistir (solo browser)
        effect(() => {
            if (!isPlatformBrowser(this.platformId)) return;
            const snapshot: State = {
                modo: this.modo(),
                duracion: this.duracion(),
                contextos: this.contextos(),
                extras: this.extras(),
                items: this.items(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        });
    }
    lang = signal<'es' | 'en'>('es');

    setLang(l: 'es' | 'en') {
        this.lang.set(l);
        this.translate.use(l);
        if (isPlatformBrowser(this.platformId)) localStorage.setItem('lang', l);
    }

    // Estado UI
    modo = signal<Modo>('viaje');
    duracion = signal<Duracion>('1-3');
    contextos = signal<Contexto[]>([]);
    extras = signal<Extra[]>([]);
    items = signal<Item[]>([]);
    nuevoItem = signal('');
    isDark = signal(false);
    pop = signal(false);
    copied = signal(false);
    copyPulse = signal(0);

    // ---- i18n keys helpers ----

    /** Convierte Categoria (texto) => key CATEGORY.* */
    categoriaKey: Record<Categoria, string> = {
        'Documentos': 'CATEGORY.Documents',
        'Ropa': 'CATEGORY.Clothing',
        'Higiene': 'CATEGORY.Hygiene',
        'Tecnología': 'CATEGORY.Tech',
        'Salud': 'CATEGORY.Health',
        'Comida': 'CATEGORY.Food',
        'Extras': 'CATEGORY.Extras',
        'Mudanza': 'CATEGORY.Moving',
    };

    /** Opciones: ahora guardamos labelKey para usar en el HTML con | translate */
    contextoOpciones: { key: Contexto; labelKey: string; icon: string }[] = [
        { key: 'playa', labelKey: 'CONTEXT.beach', icon: '🏖️' },
        { key: 'ciudad', labelKey: 'CONTEXT.city', icon: '🏙️' },
        { key: 'frio', labelKey: 'CONTEXT.cold', icon: '🧥' },
        { key: 'lluvia', labelKey: 'CONTEXT.rain', icon: '🌧️' },
        { key: 'montana', labelKey: 'CONTEXT.mountain', icon: '⛰️' },
        { key: 'camping', labelKey: 'CONTEXT.camping', icon: '🏕️' },
        { key: 'trabajo', labelKey: 'CONTEXT.remoteWork', icon: '💻' },
        { key: 'negocios', labelKey: 'CONTEXT.meetings', icon: '💼' },
        { key: 'evento', labelKey: 'CONTEXT.event', icon: '🎟️' },
        { key: 'internacional', labelKey: 'CONTEXT.international', icon: '🌍' },
        { key: 'avion', labelKey: 'CONTEXT.plane', icon: '🛫' },
        { key: 'inviernoExtremo', labelKey: 'CONTEXT.extremeWinter', icon: '❄️' },
        { key: 'formal', labelKey: 'CONTEXT.formal', icon: '🕴️' },
    ];

    extraOpciones: { key: Extra; labelKey: string; icon: string }[] = [
        { key: 'laptop', labelKey: 'EXTRAS.laptop', icon: '💻' },
        { key: 'gym', labelKey: 'EXTRAS.gym', icon: '🏋️' },
        { key: 'kids', labelKey: 'EXTRAS.kids', icon: '🧒' },
        { key: 'bebe', labelKey: 'EXTRAS.baby', icon: '🍼' },
        { key: 'mascota', labelKey: 'EXTRAS.pet', icon: '🐶' },
        { key: 'medicacion', labelKey: 'EXTRAS.meds', icon: '💊' },
        { key: 'coche', labelKey: 'EXTRAS.car', icon: '🚗' },
        { key: 'foto', labelKey: 'EXTRAS.photo', icon: '📷' },
        { key: 'playaPlus', labelKey: 'EXTRAS.beachPlus', icon: '🧴' },
    ];

    stats = computed(() => {
        const all = this.items();
        const done = all.filter(i => i.hecho).length;
        return { total: all.length, hecho: done, faltan: all.length - done };
    });

    categoriasOrden: Categoria[] = ['Documentos', 'Ropa', 'Higiene', 'Salud', 'Tecnología', 'Comida', 'Extras', 'Mudanza'];

    itemsPorCategoria = computed(() => {
        const map = new Map<Categoria, Item[]>();
        for (const cat of this.categoriasOrden) map.set(cat, []);

        for (const it of this.items()) {
            if (!map.has(it.categoria)) map.set(it.categoria, []);
            map.get(it.categoria)!.push(it);
        }

        return [...map.entries()].filter(([, arr]) => arr.length > 0);
    });

    // Toggles
    toggleContexto(c: Contexto) {
        const set = new Set(this.contextos());
        set.has(c) ? set.delete(c) : set.add(c);
        this.contextos.set([...set]);
    }

    toggleExtra(e: Extra) {
        const set = new Set(this.extras());
        set.has(e) ? set.delete(e) : set.add(e);
        this.extras.set([...set]);
    }

    // Helpers
    /** Agrega un item traducible (key = ITEMS.X) */
    private addKey(cat: Categoria, itemKey: string, cantidad?: number): Item {
        return { id: uid(), categoria: cat, texto: itemKey, key: `ITEMS.${itemKey}`, cantidad, hecho: false };
    }

    /** Agrega un item libre (texto literal) */
    private addText(cat: Categoria, textoLibre: string, cantidad?: number): Item {
        return { id: uid(), categoria: cat, texto: textoLibre, cantidad, hecho: false };
    }

    private dedupe(items: Item[]) {
        const seen = new Set<string>();
        return items.filter(i => {
            // si es traducible, dedupe por key; si es libre, por texto
            const base = i.key ?? i.texto;
            const key = `${i.categoria}::${base}`.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Generación
    generar() {
        const modo = this.modo();
        const dur = this.duracion();

        const qty = (() => {
            if (dur === '1-3') return { dias: 3, ropa: 3 };
            if (dur === '4-7') return { dias: 7, ropa: 7 };
            return { dias: 10, ropa: 10 };
        })();

        const ctx = new Set(this.contextos());
        const ex = new Set(this.extras());

        const baseViaje: Item[] = [
            // Documentos
            this.addKey('Documentos', 'DNI_PASSPORT'),
            this.addKey('Documentos', 'CARDS_CASH'),
            this.addKey('Documentos', 'DRIVER_LICENSE'),
            this.addKey('Documentos', 'INSURANCE'),
            this.addKey('Documentos', 'RESERVATIONS'),
            this.addKey('Documentos', 'KEYS'),

            // Ropa
            this.addKey('Ropa', 'UNDERWEAR', qty.ropa),
            this.addKey('Ropa', 'SOCKS', qty.ropa),
            this.addKey('Ropa', 'TSHIRTS', Math.max(2, Math.ceil(qty.ropa * 0.8))),
            this.addKey('Ropa', 'PANTS', qty.dias <= 3 ? 1 : 2),
            this.addKey('Ropa', 'LIGHT_JACKET', 1),
            this.addKey('Ropa', 'PAJAMAS', 1),
            this.addKey('Ropa', 'SNEAKERS', 1),

            // Higiene
            this.addKey('Higiene', 'TOOTHBRUSH', 1),
            this.addKey('Higiene', 'DEODORANT', 1),
            this.addKey('Higiene', 'SHAMPOO_MINI', 1),
            this.addKey('Higiene', 'SOAP', 1),
            this.addKey('Higiene', 'COMB', 1),
            this.addKey('Higiene', 'SHAVER', 1),
            this.addKey('Higiene', 'NAIL_KIT', 1),
            this.addKey('Higiene', 'SUNSCREEN', 1),
            this.addKey('Higiene', 'FEM_HYGIENE', 1),

            // Salud
            this.addKey('Salud', 'BASIC_FIRST_AID', 1),
            this.addKey('Salud', 'PAINKILLER', 1),
            this.addKey('Salud', 'BAND_AIDS', 1),
            this.addKey('Salud', 'HAND_SANITIZER', 1),
            this.addKey('Salud', 'ANTIHISTAMINE', 1),

            // Tecnología
            this.addKey('Tecnología', 'PHONE', 1),
            this.addKey('Tecnología', 'PHONE_CHARGER', 1),
            this.addKey('Tecnología', 'POWER_BANK', 1),
            this.addKey('Tecnología', 'EARBUDS', 1),
            this.addKey('Tecnología', 'EXTRA_CABLE', 1),

            // Comida
            this.addKey('Comida', 'WATER_BOTTLE', 1),
            this.addKey('Comida', 'SNACKS', 1),

            // Extras
            this.addKey('Extras', 'GLASSES', 1),
            this.addKey('Extras', 'EAR_PLUGS', 1),
            this.addKey('Extras', 'LAUNDRY_BAG', 1),
            this.addKey('Extras', 'PADLOCK', 1),
            this.addKey('Extras', 'DAY_BAG', 1),
        ];

        const baseMudanza: Item[] = [
            this.addKey('Mudanza', 'BOXES_BAGS'),
            this.addKey('Mudanza', 'PACKING_TAPE'),
            this.addKey('Mudanza', 'MARKER'),
            this.addKey('Mudanza', 'LABELS'),
            this.addKey('Mudanza', 'STRETCH_FILM'),
            this.addKey('Mudanza', 'BUBBLE_WRAP'),
            this.addKey('Mudanza', 'TRASH_BAGS'),
            this.addKey('Mudanza', 'SCREWDRIVER'),
            this.addKey('Mudanza', 'PLIERS_WRENCH'),
            this.addKey('Mudanza', 'CUTTER_SCISSORS'),
            this.addKey('Mudanza', 'GLOVES_MOVE'),
            this.addKey('Mudanza', 'CLOTHS'),
            this.addKey('Mudanza', 'CLEANING'),
            this.addKey('Mudanza', 'CHARGERS_HANDY'),
            this.addKey('Mudanza', 'FIRST_DAY_BAG'),
            this.addKey('Mudanza', 'INVENTORY'),
            this.addKey('Mudanza', 'IMPORTANT_DOCS'),
            this.addKey('Mudanza', 'KEYS_MOVE'),
            this.addKey('Mudanza', 'PROTECT_CORNERS'),
            this.addKey('Mudanza', 'SEPARATE_FRAGILE'),
            this.addKey('Mudanza', 'FRIDGE'),
            this.addKey('Mudanza', 'MEASURE_DOORS'),
        ];

        const porDuracion: Item[] = [];
        if (modo === 'viaje') {
            if (dur === '4-7') {
                porDuracion.push(this.addKey('Ropa', 'OUTFIT_EXTRA'));
                porDuracion.push(this.addKey('Higiene', 'MOISTURIZER'));
                porDuracion.push(this.addKey('Extras', 'PACKING_CUBES'));
            }
            if (dur === '8+') {
                porDuracion.push(this.addKey('Ropa', 'LAUNDRY_PLAN'));
                porDuracion.push(this.addKey('Salud', 'BIGGER_FIRST_AID'));
                porDuracion.push(this.addKey('Higiene', 'HYGIENE_EXTRA'));
                porDuracion.push(this.addKey('Extras', 'BOOK_FUN'));
                porDuracion.push(this.addKey('Extras', 'MINI_DETERGENT', 1));
                porDuracion.push(this.addKey('Extras', 'CLOTHESLINE', 1));
            }
        }

        const porContexto: Item[] = [];
        if (ctx.has('playa')) {
            porContexto.push(this.addKey('Ropa', 'SWIMSUIT'));
            porContexto.push(this.addKey('Ropa', 'FLIPFLOPS'));
            porContexto.push(this.addKey('Extras', 'TOWEL'));
            porContexto.push(this.addKey('Extras', 'HAT'));
            porContexto.push(this.addKey('Extras', 'DRY_BAG'));
        }
        if (ctx.has('ciudad')) {
            porContexto.push(this.addKey('Ropa', 'SPARE_SNEAKERS'));
            porContexto.push(this.addKey('Extras', 'TRANSIT_CARD'));
            porContexto.push(this.addKey('Extras', 'COMPACT_UMBRELLA'));
        }
        if (ctx.has('frio')) {
            porContexto.push(this.addKey('Ropa', 'WARM_COAT'));
            porContexto.push(this.addKey('Ropa', 'SCARF_BEANIE'));
            porContexto.push(this.addKey('Ropa', 'GLOVES'));
            porContexto.push(this.addKey('Ropa', 'THERMAL'));
        }
        if (ctx.has('lluvia')) {
            porContexto.push(this.addKey('Ropa', 'RAIN_JACKET'));
            porContexto.push(this.addKey('Extras', 'WET_SHOE_BAG'));
        }
        if (ctx.has('montana')) {
            porContexto.push(this.addKey('Ropa', 'TREKKING_SHOES'));
            porContexto.push(this.addKey('Salud', 'ALTITUDE_SUNSCREEN'));
            porContexto.push(this.addKey('Extras', 'HEADLAMP'));
        }
        if (ctx.has('camping')) {
            porContexto.push(this.addKey('Extras', 'TENT'));
            porContexto.push(this.addKey('Extras', 'SLEEPING_BAG'));
            porContexto.push(this.addKey('Extras', 'MAT'));
            porContexto.push(this.addKey('Extras', 'REPELLENT'));
            porContexto.push(this.addKey('Extras', 'LIGHTER'));
        }
        if (ctx.has('trabajo')) {
            porContexto.push(this.addKey('Tecnología', 'POWER_STRIP'));
            porContexto.push(this.addKey('Tecnología', 'MOUSE'));
            porContexto.push(this.addKey('Tecnología', 'KEYBOARD'));
            porContexto.push(this.addKey('Extras', 'NOTEBOOK_PEN'));
        }
        if (ctx.has('negocios')) {
            porContexto.push(this.addKey('Ropa', 'SHIRT_FORMAL'));
            porContexto.push(this.addKey('Ropa', 'FORMAL_SHOES'));
            porContexto.push(this.addKey('Higiene', 'PERFUME'));
        }
        if (ctx.has('evento')) {
            porContexto.push(this.addKey('Ropa', 'EVENT_OUTFIT'));
            porContexto.push(this.addKey('Extras', 'TICKET'));
        }
        if (ctx.has('internacional')) {
            porContexto.push(this.addKey('Documentos', 'PASSPORT_VALID', 1));
            porContexto.push(this.addKey('Documentos', 'VISA_ETA', 1));
            porContexto.push(this.addKey('Documentos', 'INSURANCE_PRINTED', 1));
            porContexto.push(this.addKey('Tecnología', 'PLUG_ADAPTER', 1));
            porContexto.push(this.addKey('Tecnología', 'ESIM_ROAMING', 1));
            porContexto.push(this.addKey('Extras', 'LOCAL_CURRENCY', 1));
            porContexto.push(this.addKey('Extras', 'OFFLINE_MAPS', 1));
        }
        if (ctx.has('avion')) {
            porContexto.push(this.addKey('Documentos', 'BOARDING_PASS', 1));
            porContexto.push(this.addKey('Higiene', 'ZIPLOCK', 1));
            porContexto.push(this.addKey('Extras', 'NECK_PILLOW', 1));
            porContexto.push(this.addKey('Extras', 'EYE_MASK', 1));
            porContexto.push(this.addKey('Extras', 'EAR_PLUGS', 1));
        }
        if (ctx.has('inviernoExtremo')) {
            porContexto.push(this.addKey('Ropa', 'THERMAL_TOP', qty.dias <= 3 ? 1 : 2));
            porContexto.push(this.addKey('Ropa', 'THERMAL_BOTTOM', qty.dias <= 3 ? 1 : 2));
            porContexto.push(this.addKey('Ropa', 'WARM_COAT', 1));
            porContexto.push(this.addKey('Ropa', 'GLOVES', 1));
            porContexto.push(this.addKey('Ropa', 'BEANIE', 1));
            porContexto.push(this.addKey('Ropa', 'SCARF', 1));
            porContexto.push(this.addKey('Extras', 'HAND_WARMERS', 1));
        }
        if (ctx.has('formal')) {
            porContexto.push(this.addKey('Ropa', 'FORMAL_OUTFIT', 1));
            porContexto.push(this.addKey('Ropa', 'FORMAL_SHOES', 1));
            porContexto.push(this.addKey('Higiene', 'PERFUME', 1));
        }

        const porExtras: Item[] = [];
        if (ex.has('laptop')) {
            porExtras.push(this.addKey('Tecnología', 'LAPTOP'));
            porExtras.push(this.addKey('Tecnología', 'LAPTOP_CHARGER'));
            porExtras.push(this.addKey('Tecnología', 'DONGLE'));
        }
        if (ex.has('gym')) {
            porExtras.push(this.addKey('Ropa', 'SPORTS_OUTFIT'));
            porExtras.push(this.addKey('Ropa', 'SPORT_SHOES'));
            porExtras.push(this.addKey('Higiene', 'SMALL_TOWEL'));
            porExtras.push(this.addKey('Extras', 'GYM_WATER'));
        }
        if (ex.has('kids')) {
            porExtras.push(this.addKey('Comida', 'EXTRA_SNACKS'));
            porExtras.push(this.addKey('Extras', 'FAVORITE_TOY'));
            porExtras.push(this.addKey('Higiene', 'WIPES'));
            porExtras.push(this.addKey('Extras', 'EXTRA_CHANGE'));
        }
        if (ex.has('bebe')) {
            porExtras.push(this.addKey('Extras', 'DIAPERS'));
            porExtras.push(this.addKey('Extras', 'BABY_WIPES'));
            porExtras.push(this.addKey('Extras', 'FULL_CHANGE'));
            porExtras.push(this.addKey('Comida', 'MILK_BOTTLE'));
            porExtras.push(this.addKey('Salud', 'BABY_CREAM'));
        }
        if (ex.has('mascota')) {
            porExtras.push(this.addKey('Extras', 'PET_FOOD'));
            porExtras.push(this.addKey('Extras', 'LEASH'));
            porExtras.push(this.addKey('Extras', 'BAGS'));
            porExtras.push(this.addKey('Extras', 'BOWL'));
        }
        if (ex.has('medicacion')) {
            porExtras.push(this.addKey('Salud', 'MEDS_PRESCRIPTION'));
            porExtras.push(this.addKey('Salud', 'PILLBOX'));
            porExtras.push(this.addKey('Salud', 'PAIN_MEDS'));
        }
        if (ex.has('coche')) {
            porExtras.push(this.addKey('Extras', 'CAR_CHARGER'));
            porExtras.push(this.addKey('Extras', 'PHONE_HOLDER'));
            porExtras.push(this.addKey('Extras', 'CAR_DOCS'));
            porExtras.push(this.addKey('Salud', 'CAR_FIRST_AID'));
        }
        if (ex.has('foto')) {
            porExtras.push(this.addKey('Tecnología', 'CAMERA'));
            porExtras.push(this.addKey('Tecnología', 'CAMERA_CHARGER'));
            porExtras.push(this.addKey('Tecnología', 'SD_CARD'));
            porExtras.push(this.addKey('Extras', 'TRIPOD'));
        }
        if (ex.has('playaPlus')) {
            porExtras.push(this.addKey('Extras', 'HIGH_SPF'));
            porExtras.push(this.addKey('Extras', 'AFTER_SUN'));
            porExtras.push(this.addKey('Extras', 'REPELLENT'));
        }

        const all = [
            ...(modo === 'viaje' ? baseViaje : baseMudanza),
            ...porDuracion,
            ...porContexto,
            ...porExtras,
        ];

        this.items.set(this.dedupe(all));
        this.pop.set(false);
        setTimeout(() => this.pop.set(true), 0);
    }

    // Checklist ops
    toggleHecho(id: string) {
        this.items.set(this.items().map(i => (i.id === id ? { ...i, hecho: !i.hecho } : i)));
    }

    borrarItem(id: string) {
        this.items.set(this.items().filter(i => i.id !== id));
    }

    agregarItem() {
        const txt = this.nuevoItem().trim();
        if (!txt) return;

        // item libre (no traducible)
        this.items.set(this.dedupe([this.addText('Extras', txt), ...this.items()]));
        this.nuevoItem.set('');
    }

    limpiar() {
        this.modo.set('viaje');
        this.duracion.set('1-3');
        this.contextos.set([]);
        this.extras.set([]);
        this.items.set([]);
        this.nuevoItem.set('');
        if (isPlatformBrowser(this.platformId)) localStorage.removeItem(STORAGE_KEY);
    }

    copiarLista() {
        if (!isPlatformBrowser(this.platformId)) return;

        const lines: string[] = [];

        for (const [cat, items] of this.itemsPorCategoria()) {
            const catLabel = this.getCategoryLabel(cat);
            lines.push(`\n${catLabel.toUpperCase()}`);

            for (const it of items) {
                const label = this.getItemLabel(it);
                const qty = it.cantidad ? ` x${it.cantidad}` : '';
                lines.push(`${it.hecho ? '✅' : '☐'} ${label}${qty}`);
            }
        }

        const text = lines.join('\n').trim();

        navigator.clipboard?.writeText(text).then(() => {
            this.copied.set(true);
            this.copyPulse.update(v => v + 1);
            setTimeout(() => this.copied.set(false), 1200);
        });
    }

    // Theme
    initTheme() {
        if (!isPlatformBrowser(this.platformId)) return;

        const saved = localStorage.getItem('theme');
        if (saved) {
            this.isDark.set(saved === 'dark');
        } else {
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
            this.isDark.set(prefersDark);
        }

        this.applyTheme();
    }

    applyTheme() {
        if (!isPlatformBrowser(this.platformId)) return;

        const root = document.documentElement;
        if (this.isDark()) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }

    toggleTheme() {
        this.isDark.update(v => !v);
        this.applyTheme();
    }
    private categoryKeyMap: Record<Categoria, string> = {
        Documentos: 'CATEGORY.Documents',
        Ropa: 'CATEGORY.Clothing',
        Higiene: 'CATEGORY.Hygiene',
        Tecnología: 'CATEGORY.Tech',
        Salud: 'CATEGORY.Health',
        Comida: 'CATEGORY.Food',
        Extras: 'CATEGORY.Extras',
        Mudanza: 'CATEGORY.Moving',
    };

    private tKey(key: string) {
        const v = this.translate.instant(key);
        // ngx-translate: si no existe, devuelve la key tal cual
        return v === key ? '' : v;
    }

    private getCategoryLabel(cat: Categoria) {
        const key = this.categoryKeyMap[cat] ?? '';
        return key ? (this.tKey(key) || String(cat)) : String(cat);
    }

    private getItemLabel(it: Item) {
        // Si es un item "preset", it.texto es la key (DNI_PASSPORT, etc.)
        const maybeKey = `ITEMS.${it.texto}`;
        const translated = this.tKey(maybeKey);
        return translated || it.texto; // fallback: texto libre del usuario
    }
}