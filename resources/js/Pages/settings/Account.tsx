import { useForm, usePage } from '@inertiajs/react';
import { Button, Callout, Icon, Input, Modal, Text } from '@particle-academy/react-fancy';
import { useState, type FormEvent, type ReactNode } from 'react';
import { SettingsLayout } from '@/layouts/SettingsLayout';

type Auth = { user: { name: string; email: string } | null };

/**
 * Account tab: the three account-level surfaces that used to live on separate
 * /settings/profile and /settings/password pages, now stacked in one place —
 * profile (name/email, via Fortify), password (via Fortify), and the danger
 * zone. Each keeps its own independent form/endpoint; only the presentation is
 * consolidated.
 */
export default function Account() {
    return (
        <SettingsLayout title="Account">
            <div className="flex flex-col gap-10">
                <ProfileSection />
                <PasswordSection />
                <DeleteAccount />
            </div>
        </SettingsLayout>
    );
}

/** A labelled sub-section within the Account card. */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="mt-0.5 mb-4 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            {children}
        </section>
    );
}

/** Name + email — PUTs to Fortify's /user/profile-information. */
function ProfileSection() {
    const user = usePage<{ auth: Auth }>().props.auth?.user;
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/user/profile-information', { preserveScroll: true });
    };

    return (
        <Section title="Profile" description="Update your name and the email address associated with your account.">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Input label="Name" required value={data.name} onValueChange={(v) => setData('name', v)} error={errors.name} />
                <Input label="Email" type="email" required value={data.email} onValueChange={(v) => setData('email', v)} error={errors.email} />
                <div className="flex items-center gap-3">
                    <Button type="submit" color="amber" icon="check" loading={processing}>
                        Save changes
                    </Button>
                    {recentlySuccessful && (
                        <Callout color="emerald" className="!py-1 text-sm">
                            Saved.
                        </Callout>
                    )}
                </div>
            </form>
        </Section>
    );
}

/** Change password — PUTs to Fortify's /user/password. */
function PasswordSection() {
    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/user/password', {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <Section title="Password" description="Use a long, unique password to keep your collection secure.">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={data.current_password}
                    onValueChange={(v) => setData('current_password', v)}
                    error={errors.current_password}
                />
                <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={data.password}
                    onValueChange={(v) => setData('password', v)}
                    error={errors.password}
                />
                <Input
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={data.password_confirmation}
                    onValueChange={(v) => setData('password_confirmation', v)}
                    error={errors.password_confirmation}
                />
                <div className="flex items-center gap-3">
                    <Button type="submit" color="amber" icon="check" loading={processing}>
                        Update password
                    </Button>
                    {recentlySuccessful && (
                        <Callout color="emerald" className="!py-1 text-sm">
                            Updated.
                        </Callout>
                    )}
                </div>
            </form>
        </Section>
    );
}

/**
 * Danger zone: permanently delete the current user's own account. Deliberately
 * multi-step — the button only opens a modal, and the DELETE is submitted only
 * after the user re-types their password.
 */
function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const {
        data,
        setData,
        delete: destroy,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({ password: '' });

    const close = () => {
        setOpen(false);
        clearErrors();
        reset();
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        // Hits DELETE /settings/account -> ProfileController@destroy, which acts
        // strictly on the authenticated user. On failure (e.g. wrong password)
        // the modal stays open and the validation error is shown.
        destroy('/settings/account', {
            preserveScroll: true,
            onError: () => reset(),
        });
    };

    return (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/[0.04] p-5 dark:bg-rose-500/[0.06]">
            <div className="flex items-center gap-2">
                <Icon name="triangle-alert" size="sm" className="text-rose-600 dark:text-rose-400" />
                <h3 className="text-base font-semibold text-rose-700 dark:text-rose-400">Danger zone</h3>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Permanently delete your account and every vinyl in your collection. This action is
                irreversible — there is no way to recover your data afterwards.
            </p>
            <Button color="rose" icon="trash-2" className="mt-4" onClick={() => setOpen(true)}>
                Delete account
            </Button>

            <Modal open={open} onClose={close} size="md" className="max-w-md">
                <form onSubmit={submit} className="flex flex-col gap-4 p-6">
                    <div className="flex items-center gap-2">
                        <Icon name="triangle-alert" size="sm" className="text-rose-600 dark:text-rose-400" />
                        <Text as="span" size="lg" weight="semibold" className="text-zinc-900 dark:text-zinc-100">
                            Delete your account?
                        </Text>
                    </div>

                    <Callout color="rose" icon={<Icon name="triangle-alert" size="sm" />}>
                        This permanently deletes your account and all of your vinyl records. This cannot
                        be undone.
                    </Callout>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Enter your password to confirm.</p>

                    <Input
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        required
                        value={data.password}
                        onValueChange={(v) => setData('password', v)}
                        error={errors.password}
                    />

                    <div className="mt-2 flex justify-end gap-3">
                        <Button type="button" variant="ghost" color="zinc" onClick={close}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="rose"
                            icon="trash-2"
                            loading={processing}
                            disabled={data.password.length === 0}
                        >
                            Permanently delete
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
