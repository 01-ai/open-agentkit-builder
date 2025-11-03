# Variable Components

This document describes the `VariableItem` and `VariableConfig` components for displaying and editing state variables.

## Components Overview

### `VariableItem`

A compact single-line component for displaying state variables with optional edit/delete actions.

**Features:**

- Type-specific icons (String, Number, Boolean, Object, Array)
- Variable name display
- Type badge
- Optional default value display
- Optional edit button (opens configuration dialog)
- Optional delete button

**Usage Example:**

```tsx
import { VariableItem } from './components/variable-item'

// Basic display (read-only)
<VariableItem
  variable={{
    id: 'user_name',
    name: 'user_name',
    type: 'string',
    default: 'Guest'
  }}
/>

// With all features enabled
<VariableItem
  variable={variable}
  onChange={(updatedVar) => handleVariableChange(updatedVar)}
  onRemove={() => handleRemoveVariable()}
  showDefaultValue={true}
  showEditButton={true}
  showDeleteButton={true}
/>
```

**Props:**

| Prop               | Type                                | Default  | Description                              |
| ------------------ | ----------------------------------- | -------- | ---------------------------------------- |
| `variable`         | `StateVariable`                     | required | The variable to display                  |
| `onChange`         | `(variable: StateVariable) => void` | optional | Callback when variable is edited         |
| `onRemove`         | `() => void`                        | optional | Callback when delete button is clicked   |
| `showDefaultValue` | `boolean`                           | `false`  | Show default value next to variable name |
| `showEditButton`   | `boolean`                           | `false`  | Show edit/settings button                |
| `showDeleteButton` | `boolean`                           | `false`  | Show delete button                       |

---

### `VariableConfig`

A reusable form component for editing state variable properties (type, name, default value).

**Features:**

- Type selector with 5 types (String, Number, Boolean, Object, List)
- Name input field
- Type-specific default value input
- Automatic value parsing and validation
- JSON input support for Object and Array types

**Usage Example:**

```tsx
import { VariableConfig } from './components/variable-config'

function MyEditor() {
  const [variable, setVariable] = useState<StateVariable>({
    id: 'my_var',
    name: 'my_var',
    type: 'string',
    default: '',
  })

  return <VariableConfig variable={variable} onChange={setVariable} />
}
```

**Props:**

| Prop       | Type                                | Default  | Description                        |
| ---------- | ----------------------------------- | -------- | ---------------------------------- |
| `variable` | `StateVariable`                     | required | The variable to edit               |
| `onChange` | `(variable: StateVariable) => void` | required | Callback when variable is modified |

---

## Type System

### Supported Types

| Type      | Icon   | Color  | Default Value | Input Type          |
| --------- | ------ | ------ | ------------- | ------------------- |
| `string`  | Text   | Green  | `""`          | Text input          |
| `number`  | Hash   | Blue   | `0`           | Number input        |
| `boolean` | Binary | Orange | `false`       | Toggle (True/False) |
| `object`  | Braces | Purple | `{}`          | JSON textarea       |
| `array`   | List   | Pink   | `[]`          | JSON textarea       |

### Type Icons

The `VariableItem` component uses different icons for each type:

- **String**: Text icon (📝)
- **Number**: Hash icon (#)
- **Boolean**: Binary icon (0/1)
- **Object**: Braces icon ({})
- **Array**: List icon ([])

---

## Integration with Start Node

The `start-config.tsx` has been refactored to use `VariableConfig`:

```tsx
// Before: All logic in StateVariableEditor
// After: Delegates to VariableConfig component

function StateVariableEditor({ variable, onChange, onRemove }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Variable</span>
        <FormRemoveButton onClick={onRemove} />
      </div>

      <VariableConfig variable={variable} onChange={onChange} />
    </div>
  )
}
```

---

## Common Use Cases

### 1. Read-only Variable List

Display variables without edit capabilities:

```tsx
{
  variables.map((variable) => (
    <VariableItem key={variable.id} variable={variable} />
  ))
}
```

### 2. Editable Variable List

Full editing with inline dialog:

```tsx
{
  variables.map((variable, index) => (
    <VariableItem
      key={variable.id}
      variable={variable}
      onChange={(updated) => handleUpdate(index, updated)}
      onRemove={() => handleRemove(index)}
      showDefaultValue={true}
      showEditButton={true}
      showDeleteButton={true}
    />
  ))
}
```

### 3. Custom Edit Dialog

Create your own dialog with `VariableConfig`:

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Variable</DialogTitle>
    </DialogHeader>
    <VariableConfig variable={editedVariable} onChange={setEditedVariable} />
    <DialogFooter>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Styling

Both components follow the project's design system:

- Uses `shadcn/ui` components (Badge, Button, Dialog, etc.)
- Follows Tailwind CSS conventions
- Supports dark mode automatically
- Responsive design for different screen sizes

---

## Future Enhancements

- [ ] JSON Schema editor for Object type
- [ ] Array item editor (visual array builder)
- [ ] Variable reference picker (link to other variables)
- [ ] Expression builder for computed defaults
- [ ] Variable validation rules
- [ ] Drag-and-drop reordering in lists
