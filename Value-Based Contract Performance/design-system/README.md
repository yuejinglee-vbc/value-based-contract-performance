# VBC Design System

A reusable component library and design token system for value-based care dashboards, extracted from the **Value-Based Contract Performance** project.

## What's Included

- **3 theme variants** — Ocean (blue), Slate (indigo), Midnight (dark teal)
- **Design tokens** — color palette, spacing, typography scales
- **Primitive components** — KPIs, badges, chips, buttons, progress bars, sparklines
- **Data patterns** — sortable tables, filter chips, modal overlays, snackbars
- **Layout patterns** — sidebar navigation, breadcrumbs, card containers

## Quick Start

### 1. Include dependencies in your HTML

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
```

### 2. Load the design system

```html
<script type="text/babel" src="vbc-design-system.jsx"></script>
```

### 3. Apply CSS utilities (copy from demo.html `<style>` block)

The design system expects certain base styles and CSS custom properties. Copy the `:root`, `.btn-base`, `.row-hover`, `.fade-in`, `.slide-up`, and `.bar-fill` rules from `demo.html` into your page.

### 4. Use components

```jsx
const { useState } = React;

const App = () => {
  const T = THEMES.ocean;  // or .slate, .midnight

  // Apply theme to CSS vars
  React.useEffect(() => {
    Object.entries(T).forEach(([k, v]) => {
      if (k !== 'label') {
        document.documentElement.style.setProperty(
          `--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`, 
          v
        );
      }
    });
  }, [T]);

  return (
    <div style={{ padding: 40, background: T.bg }}>
      <KPI 
        label="Total Contracts" 
        value="6" 
        sub="3 on track, 2 at risk" 
        accent={T.accent} 
        T={T} 
      />
      
      <Button variant="primary" onClick={() => alert('clicked')}>
        Primary Action
      </Button>
      
      <StatusBadge 
        label="On track" 
        color={T.success} 
        bg={T.successBg} 
        T={T} 
      />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

## Components

### KPI
Large metric card with label, value, subtitle, and colored top border.

**Props:**
- `label` (string) — metric name
- `value` (string|number) — primary value
- `sub` (string) — optional subtitle/context
- `accent` (color) — top border color
- `T` (theme object)
- `style` (object) — additional inline styles

**Example:**
```jsx
<KPI 
  label="Attributed Members" 
  value="42,830" 
  sub="↑ 2.3% vs prior period" 
  accent={T.success} 
  T={T} 
/>
```

---

### DeltaChip
Shows a value with a change indicator (up/down arrow + delta), color-coded by favorability.

**Props:**
- `value` (string|number) — current value
- `delta` (number) — change amount
- `unit` (string) — unit suffix (e.g. "/pm", " pts")
- `lowerIsBetter` (boolean) — if true, negative delta is favorable (green); default `false`
- `T` (theme object)

**Example:**
```jsx
<DeltaChip value="$456" delta={14} unit="/pm" lowerIsBetter={true} T={T} />
// Renders: $456 ▲ 14/pm (red, since cost is higher and lowerIsBetter=true)
```

---

### StatusBadge
Colored pill with a label. Use for status indicators, tags, or categories.

**Props:**
- `label` (string)
- `color` (color) — text color
- `bg` (color) — background color
- `T` (theme object)

**Example:**
```jsx
<StatusBadge label="At risk" color={T.warn} bg={T.warnBg} T={T} />
```

---

### ProgressBar
Horizontal bar with a vertical target indicator.

**Props:**
- `value` (number) — current value
- `target` (number) — target line position
- `max` (number) — full width value
- `height` (number) — bar height in px; default `8`
- `T` (theme object)

**Example:**
```jsx
<ProgressBar value={72} target={75} max={100} height={10} T={T} />
```

---

### Spark
Mini trend line chart.

**Props:**
- `points` (number[]) — data series (min 2 points)
- `width` (number) — SVG width; default `60`
- `height` (number) — SVG height; default `20`
- `color` (color) — line color; default `#10b981`
- `T` (theme object)

**Example:**
```jsx
<Spark points={[412, 418, 425, 430, 438]} width={90} height={28} color={T.danger} T={T} />
```

---

### Button
Primary, secondary, or ghost button styles.

**Props:**
- `children` (node)
- `variant` (string) — `'primary'` | `'secondary'` | `'ghost'`; default `'primary'`
- `onClick` (function)
- `disabled` (boolean)
- `style` (object)

**Example:**
```jsx
<Button variant="primary" onClick={() => console.log('clicked')}>
  Save Changes
</Button>
```

---

### FilterChip
Toggle button for filters. Active state changes background/text color.

**Props:**
- `label` (string)
- `isActive` (boolean)
- `onClick` (function)
- `color` (color) — text color when active
- `bg` (color) — background when inactive
- `T` (theme object)

**Example:**
```jsx
<FilterChip 
  label="On track" 
  isActive={filter === 'on_track'} 
  onClick={() => setFilter('on_track')} 
  color={T.success} 
  bg={T.successBg} 
  T={T} 
/>
```

---

### DataTable
Sortable table with hover states.

**Props:**
- `columns` (array) — column definitions:
  - `key` (string) — data key
  - `label` (string) — column header
  - `sortable` (boolean)
  - `align` (string) — `'left'` | `'right'` | `'center'`
  - `width` (string) — grid column width (e.g. `'2fr'`, `'100px'`)
  - `render` (function) — custom cell renderer `(row) => ReactNode`
  - `muted` (boolean) — dimmed text color
  - `bold` (boolean) — bold text
- `data` (array) — row data
- `sortKey` (string) — current sort column key
- `sortDir` (string) — `'asc'` | `'desc'`
- `onSort` (function) — `(key) => void`
- `onRowClick` (function) — `(row) => void`
- `T` (theme object)

**Example:**
```jsx
<DataTable
  columns={[
    { key: 'name', label: 'Contract', sortable: true, width: '2fr' },
    { key: 'members', label: 'Members', sortable: true, align: 'right', width: '100px', render: r => fmtN(r.members) },
    { key: 'status', label: 'Status', width: '110px', render: r => <StatusBadge label={r.status} {...} /> },
  ]}
  data={contracts}
  sortKey={sortKey}
  sortDir={sortDir}
  onSort={handleSort}
  onRowClick={(r) => navigate(r.id)}
  T={T}
/>
```

---

### Modal
Centered overlay with backdrop.

**Props:**
- `isOpen` (boolean)
- `onClose` (function)
- `children` (node)
- `width` (number) — modal width in px; default `520`
- `T` (theme object)

**Example:**
```jsx
<Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} T={T}>
  <h3>Confirm Action</h3>
  <p>Are you sure?</p>
  <Button onClick={() => setModalOpen(false)}>Cancel</Button>
</Modal>
```

---

### Snackbar
Bottom-center toast notification.

**Props:**
- `message` (string)
- `isOpen` (boolean)
- `onClose` (function)
- `variant` (string) — `'success'` | `'warn'` | `'error'`; default `'success'`
- `T` (theme object)

**Example:**
```jsx
<Snackbar 
  message="Changes saved successfully" 
  isOpen={snackOpen} 
  onClose={() => setSnackOpen(false)} 
  variant="success" 
  T={T} 
/>
```

---

### Card
Container with consistent padding, border-radius, and shadow.

**Props:**
- `children` (node)
- `pad` (number) — padding in px; default `18`
- `style` (object)
- `className` (string)

**Example:**
```jsx
<Card pad={20}>
  <SectionHead eyebrow="Q1 2026" title="Performance Summary" />
  <p>Content here...</p>
</Card>
```

---

### SectionHead
Header block with optional eyebrow and right-aligned content.

**Props:**
- `eyebrow` (string) — small label above title
- `title` (string)
- `right` (node) — content aligned to the right (e.g. filters, action buttons)
- `style` (object)

**Example:**
```jsx
<SectionHead 
  eyebrow="End of year" 
  title="Trajectory to target" 
  right={<Button variant="ghost">Export</Button>} 
/>
```

---

### Breadcrumb
Navigational breadcrumb trail.

**Props:**
- `crumbs` (array) — each item: `{ label: string, onClick?: function }`
- `T` (theme object)

**Example:**
```jsx
<Breadcrumb crumbs={[
  { label: 'Contracts', onClick: () => navigate('/') },
  { label: 'Blue Shield PPO', onClick: () => navigate('/contracts/c1') },
  { label: 'Financial Detail' }  // last crumb has no onClick
]} T={T} />
```

---

### SidebarLayout
Two-column layout with fixed-width sidebar.

**Props:**
- `sidebar` (node)
- `main` (node)
- `sidebarWidth` (number) — in px; default `240`
- `T` (theme object)

**Example:**
```jsx
<SidebarLayout 
  sidebar={<Nav items={navItems} />} 
  main={<Dashboard />} 
  sidebarWidth={260} 
  T={T} 
/>
```

---

## Utilities

### fmtN(n)
Number formatter with thousand separators.
```js
fmtN(8420)  // "8,420"
```

### fmtM(n)
Shorthand formatter for large numbers (K/M suffix).
```js
fmtM(8420)   // "8K"
fmtM(1250000) // "1.3M"
```

### fmtMoney(n)
Formats number as currency with M/K suffix.
```js
fmtMoney(8420)   // "$8K"
fmtMoney(1250000) // "$1.3M"
```

### hash(str)
Stable pseudo-random number generator from a string seed.
```js
hash("contract-c1")  // 1283746591 (always the same for this string)
```

---

## Themes

Three built-in themes: `ocean`, `slate`, `midnight`.

Each theme object contains:
- `sidebar`, `sidebarText`, `sidebarActive`, `sidebarBorder`
- `accent`, `accentDark`, `accentLight`, `accentText`
- `bg`, `cardBg`, `topbar`, `border`
- `text`, `muted`, `faint`
- `success`, `successBg`, `warn`, `warnBg`, `danger`, `dangerBg`

**To apply a theme:**
```js
const T = THEMES.ocean;
React.useEffect(() => {
  Object.entries(T).forEach(([k, v]) => {
    if (k !== 'label') {
      document.documentElement.style.setProperty(
        `--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`, 
        v
      );
    }
  });
}, [T]);
```

Then use `T.accent`, `T.text`, etc. in your component props.

---

## Demo

Open **demo.html** in a browser to see all components in action with interactive theme switching.

---

## Files

- **vbc-design-system.jsx** — main component library
- **demo.html** — interactive showcase
- **README.md** — this file

---

## License

Extracted from the Value-Based Contract Performance project. Free to use within your organization.
