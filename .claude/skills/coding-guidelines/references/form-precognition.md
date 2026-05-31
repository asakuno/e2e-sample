# Laravel Precognition Form Patterns

## Overview

**AI's critical mistake**: Using Inertia's `useForm` or manual fetch for forms instead of Laravel Precognition.

Laravel Precognition enables real-time server-side validation without full form submission, providing immediate feedback to users while maintaining Laravel's validation rules as the single source of truth.

## The Problem: Wrong Form Libraries

### Anti-Pattern 1: Inertia's useForm

```typescript
// ❌ AI writes: Inertia useForm (doesn't use Precognition)
import { useForm } from '@inertiajs/react'

function CreateMember() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/members')
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={data.name}
        onChange={(e) => setData('name', e.target.value)}
        error={errors.name}
      />
      {/* Problem: No real-time validation */}
      {/* Problem: Validation only happens on submit */}
    </form>
  )
}
```

**Why this is wrong:**
- No real-time validation feedback
- Users only see errors after full form submission
- Poor user experience for complex forms
- Duplicate validation logic needed for client-side checks

### Anti-Pattern 2: Manual Form Handling

```typescript
// ❌ AI writes: Manual form handling
function CreateMember() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/members', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    })

    if (!res.ok) {
      const data = await res.json()
      setErrors(data.errors)
    }
    // Problem: No precognitive validation
    // Problem: Manual error state management
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

**Why this is wrong:**
- Manual error state management
- No real-time validation
- Duplicate validation logic on client and server
- More code to maintain

## The Solution: Laravel Precognition

### Pattern 1: Basic Form with Real-time Validation

```typescript
// ✅ Correct: Laravel Precognition
import { useForm } from 'laravel-precognition-react'
import { router } from '@inertiajs/react'

interface CreateMemberFormData {
  name: string
  email: string
  role: string
}

export default function Create() {
  const form = useForm<CreateMemberFormData>('post', route('members.store'), {
    name: '',
    email: '',
    role: 'member',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.submit({
      onSuccess: () => {
        // Redirect after successful creation
        router.visit(route('members.index'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="名前"
        value={form.data.name}
        onChange={(e) => form.setData('name', e.target.value)}
        onBlur={() => form.validate('name')} // Real-time validation
        error={form.errors.name}
      />
      <Input
        label="メール"
        value={form.data.email}
        onChange={(e) => form.setData('email', e.target.value)}
        onBlur={() => form.validate('email')} // Real-time validation
        error={form.errors.email}
      />
      <Select
        label="役割"
        value={form.data.role}
        onChange={(value) => form.setData('role', value)}
        onBlur={() => form.validate('role')}
        error={form.errors.role}
        options={[
          { value: 'admin', label: '管理者' },
          { value: 'member', label: 'メンバー' },
          { value: 'guest', label: 'ゲスト' },
        ]}
      />
      <Button type="submit" disabled={form.processing}>
        {form.processing ? '処理中...' : '作成'}
      </Button>
    </form>
  )
}
```

### Laravel Controller Setup

```php
// app/Http/Controllers/MemberController.php
use Illuminate\Foundation\Http\FormRequest;

final class MemberController extends Controller
{
    public function store(CreateMemberRequest $request, CreateMemberUseCase $useCase): RedirectResponse
    {
        // Precognition automatically handles validation-only requests
        // Real submission executes the use case
        $useCase->execute(new CreateMemberInput(
            name: $request->validated('name'),
            email: $request->validated('email'),
            role: $request->validated('role'),
        ));

        return redirect()->route('members.index')
            ->with('success', 'メンバーを作成しました');
    }
}

// app/Http/Requests/CreateMemberRequest.php
final class CreateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:members'],
            'role' => ['required', 'in:admin,member,guest'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => '名前は必須です',
            'email.required' => 'メールアドレスは必須です',
            'email.email' => '有効なメールアドレスを入力してください',
            'email.unique' => 'このメールアドレスは既に使用されています',
            'role.in' => '有効な役割を選択してください',
        ];
    }
}
```

## Pattern 2: Edit Form with Initial Values

```typescript
// ✅ Edit form with Precognition
interface Props {
  member: Member // From Inertia props
}

export default function Edit({ member }: Props) {
  const form = useForm<UpdateMemberFormData>(
    'put',
    route('members.update', member.id),
    {
      name: member.name,
      email: member.email,
      role: member.role,
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.submit({
      onSuccess: () => {
        router.visit(route('members.show', member.id))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="名前"
        value={form.data.name}
        onChange={(e) => form.setData('name', e.target.value)}
        onBlur={() => form.validate('name')}
        error={form.errors.name}
      />
      {/* Similar for other fields */}
      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          {form.processing ? '更新中...' : '更新'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.visit(route('members.show', member.id))}
        >
          キャンセル
        </Button>
      </div>
    </form>
  )
}
```

## Pattern 3: Complex Form with Multiple Sections

```typescript
// ✅ Complex form with nested data
interface ProjectFormData {
  name: string
  description: string
  managerId: string
  memberIds: string[]
  settings: {
    isPublic: boolean
    allowComments: boolean
    notifyMembers: boolean
  }
}

export default function CreateProject({
  members
}: {
  members: { id: string; name: string }[]
}) {
  const form = useForm<ProjectFormData>('post', route('projects.store'), {
    name: '',
    description: '',
    managerId: '',
    memberIds: [],
    settings: {
      isPublic: false,
      allowComments: true,
      notifyMembers: true,
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.submit({
      onSuccess: () => {
        router.visit(route('projects.index'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Basic Information */}
      <section>
        <h2>基本情報</h2>
        <Input
          label="プロジェクト名"
          value={form.data.name}
          onChange={(e) => form.setData('name', e.target.value)}
          onBlur={() => form.validate('name')}
          error={form.errors.name}
        />
        <Textarea
          label="説明"
          value={form.data.description}
          onChange={(e) => form.setData('description', e.target.value)}
          onBlur={() => form.validate('description')}
          error={form.errors.description}
        />
      </section>

      {/* Team Assignment */}
      <section>
        <h2>チーム</h2>
        <Select
          label="マネージャー"
          value={form.data.managerId}
          onChange={(value) => form.setData('managerId', value)}
          onBlur={() => form.validate('managerId')}
          error={form.errors.managerId}
          options={members.map(m => ({ value: m.id, label: m.name }))}
        />
        <MultiSelect
          label="メンバー"
          value={form.data.memberIds}
          onChange={(value) => form.setData('memberIds', value)}
          onBlur={() => form.validate('memberIds')}
          error={form.errors.memberIds}
          options={members.map(m => ({ value: m.id, label: m.name }))}
        />
      </section>

      {/* Settings */}
      <section>
        <h2>設定</h2>
        <Checkbox
          label="公開プロジェクト"
          checked={form.data.settings.isPublic}
          onChange={(checked) =>
            form.setData('settings', {
              ...form.data.settings,
              isPublic: checked,
            })
          }
        />
        <Checkbox
          label="コメントを許可"
          checked={form.data.settings.allowComments}
          onChange={(checked) =>
            form.setData('settings', {
              ...form.data.settings,
              allowComments: checked,
            })
          }
        />
        <Checkbox
          label="メンバーに通知"
          checked={form.data.settings.notifyMembers}
          onChange={(checked) =>
            form.setData('settings', {
              ...form.data.settings,
              notifyMembers: checked,
            })
          }
        />
      </section>

      <Button type="submit" disabled={form.processing || form.hasErrors}>
        {form.processing ? '作成中...' : '作成'}
      </Button>
    </form>
  )
}
```

## Pattern 4: Form with File Upload

```typescript
// ✅ Form with file upload
interface ProfileFormData {
  name: string
  bio: string
  avatar: File | null
}

export default function EditProfile({ user }: { user: User }) {
  const form = useForm<ProfileFormData>('put', route('profile.update'), {
    name: user.name,
    bio: user.bio,
    avatar: null,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Convert to FormData for file upload
    const formData = new FormData()
    formData.append('name', form.data.name)
    formData.append('bio', form.data.bio)
    if (form.data.avatar) {
      formData.append('avatar', form.data.avatar)
    }

    form.submit({
      data: formData,
      onSuccess: () => {
        router.visit(route('profile.show'))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <FileInput
        label="アバター"
        accept="image/*"
        onChange={(file) => form.setData('avatar', file)}
        error={form.errors.avatar}
      />
      <Input
        label="名前"
        value={form.data.name}
        onChange={(e) => form.setData('name', e.target.value)}
        onBlur={() => form.validate('name')}
        error={form.errors.name}
      />
      <Textarea
        label="自己紹介"
        value={form.data.bio}
        onChange={(e) => form.setData('bio', e.target.value)}
        onBlur={() => form.validate('bio')}
        error={form.errors.bio}
      />
      <Button type="submit" disabled={form.processing}>
        {form.processing ? '更新中...' : '更新'}
      </Button>
    </form>
  )
}
```

## Form State Management

### Available Properties

```typescript
// ✅ Form state properties from Precognition
const form = useForm(/* ... */)

// Data
form.data              // Current form data
form.setData(key, val) // Update single field
form.setData(data)     // Update multiple fields

// Validation
form.validate(field)   // Validate single field
form.validateFiles()   // Validate file fields
form.errors            // Current validation errors
form.hasErrors         // Boolean: any errors present
form.touched(field)    // Boolean: field has been validated

// Submission
form.submit(options)   // Submit form
form.processing        // Boolean: submission in progress
form.reset()           // Reset to initial values
```

### Handling Submission Success/Failure

```typescript
// ✅ Comprehensive submission handling
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()

  form.submit({
    onSuccess: (response) => {
      // Handle successful submission
      router.visit(route('members.index'))
    },
    onError: (errors) => {
      // Handle validation errors (automatic)
      // Errors are already set in form.errors
      console.error('Validation failed:', errors)
    },
    onFinish: () => {
      // Always called after submission (success or error)
      console.log('Form submission completed')
    },
  })
}
```

## Best Practices

### 1. Always Validate on Blur

```typescript
// ✅ Validate on blur for better UX
<Input
  value={form.data.email}
  onChange={(e) => form.setData('email', e.target.value)}
  onBlur={() => form.validate('email')} // Validate when user leaves field
  error={form.errors.email}
/>
```

### 2. Disable Submit When Invalid

```typescript
// ✅ Prevent submission with errors
<Button
  type="submit"
  disabled={form.processing || form.hasErrors}
>
  {form.processing ? '送信中...' : '送信'}
</Button>
```

### 3. Show Validation Feedback

```typescript
// ✅ Show error only after field has been touched
<Input
  value={form.data.name}
  onChange={(e) => form.setData('name', e.target.value)}
  onBlur={() => form.validate('name')}
  error={form.touched('name') ? form.errors.name : undefined}
/>
```

## Checklist: Form Implementation

Before considering a form complete, verify:

- [ ] Using `useForm` from `laravel-precognition-react` (NOT from `@inertiajs/react`)
- [ ] All fields have `onBlur` validation
- [ ] Errors are displayed for each field
- [ ] Submit button is disabled during processing
- [ ] Submit button is disabled when form has errors
- [ ] Success handler redirects or shows confirmation
- [ ] FormRequest has proper validation rules
- [ ] Custom error messages are defined in FormRequest

## Quick Reference: Setup Checklist

**Frontend:**
1. Import `useForm` from `laravel-precognition-react`
2. Initialize with method, route, and initial data
3. Add `onChange` handlers with `setData`
4. Add `onBlur` handlers with `validate`
5. Display errors for each field
6. Handle submit with success/error callbacks

**Backend:**
1. Create FormRequest with validation rules
2. Define custom error messages
3. Return validation errors automatically (Precognition handles this)
4. Execute use case only on real submission
