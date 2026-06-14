import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HOP database...');

  // ─── Default Roles ────────────────────────────────────────────────────────
  const defaultRoles = [
    {
      name: 'SuperAdmin',
      description: 'Full platform access',
      permissions: ['*'],
      isSystem: true,
    },
    {
      name: 'Admin',
      description: 'Administrative access',
      permissions: [
        'clients:read', 'clients:create', 'clients:update',
        'invoices:read', 'invoices:create', 'invoices:update', 'invoices:pay',
        'products:read', 'products:create', 'products:update',
        'servers:read', 'servers:provision', 'servers:suspend',
        'domains:read', 'domains:register', 'domains:transfer', 'domains:renew',
        'support:read', 'support:reply', 'support:close', 'support:assign',
        'reports:read', 'settings:read',
      ],
      isSystem: true,
    },
    {
      name: 'Staff',
      description: 'Support staff access',
      permissions: [
        'clients:read',
        'invoices:read',
        'support:read', 'support:reply', 'support:close', 'support:assign',
        'reports:read',
      ],
      isSystem: true,
    },
    {
      name: 'Reseller',
      description: 'Reseller account',
      permissions: [
        'clients:read', 'clients:create', 'clients:update',
        'invoices:read', 'invoices:create',
        'products:read',
        'domains:read', 'domains:register', 'domains:renew',
        'support:read', 'support:reply',
      ],
      isSystem: true,
    },
    {
      name: 'Client',
      description: 'Standard client',
      permissions: [
        'invoices:read', 'invoices:pay',
        'domains:read',
        'support:read', 'support:reply',
      ],
      isSystem: true,
    },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }

  console.log('✅ Roles seeded');

  // ─── Default Departments ──────────────────────────────────────────────────
  const departments = [
    { name: 'General Support', description: 'General inquiries and support', slaHours: 24 },
    { name: 'Billing', description: 'Billing and payment issues', slaHours: 8 },
    { name: 'Technical Support', description: 'Technical issues', slaHours: 4 },
    { name: 'Sales', description: 'Pre-sales inquiries', slaHours: 12 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name } as any,
      update: {},
      create: dept,
    });
  }

  console.log('✅ Departments seeded');

  // ─── Default Email Templates ──────────────────────────────────────────────
  const emailTemplates = [
    {
      name: 'Welcome Email',
      slug: 'client-welcome',
      subject: 'Welcome to {company_name}!',
      bodyHtml: '<h1>Welcome, {first_name}!</h1><p>Your account has been created.</p>',
      variables: ['first_name', 'last_name', 'email', 'company_name'],
      isSystem: true,
    },
    {
      name: 'Invoice Created',
      slug: 'invoice-created',
      subject: 'Invoice #{invoice_number} from {company_name}',
      bodyHtml: '<p>Dear {first_name},</p><p>Invoice #{invoice_number} for {amount} is due on {due_date}.</p>',
      variables: ['first_name', 'invoice_number', 'amount', 'due_date', 'company_name'],
      isSystem: true,
    },
    {
      name: 'Payment Received',
      slug: 'payment-received',
      subject: 'Payment Received — Invoice #{invoice_number}',
      bodyHtml: '<p>Thank you, {first_name}! We received your payment of {amount}.</p>',
      variables: ['first_name', 'invoice_number', 'amount'],
      isSystem: true,
    },
    {
      name: 'Ticket Created',
      slug: 'ticket-created',
      subject: 'Support Ticket #{ticket_number} Created',
      bodyHtml: '<p>Hi {first_name}, your support ticket #{ticket_number} has been received.</p>',
      variables: ['first_name', 'ticket_number', 'subject'],
      isSystem: true,
    },
    {
      name: 'Ticket Reply',
      slug: 'ticket-reply',
      subject: 'Re: #{ticket_number} — {subject}',
      bodyHtml: '<p>Hi {first_name}, there is a new reply to your ticket #{ticket_number}.</p>',
      variables: ['first_name', 'ticket_number', 'subject', 'reply_message'],
      isSystem: true,
    },
    {
      name: 'Password Reset',
      slug: 'password-reset',
      subject: 'Password Reset Request',
      bodyHtml: '<p>Click the link below to reset your password:</p><p><a href="{reset_link}">{reset_link}</a></p><p>This link expires in 1 hour.</p>',
      variables: ['first_name', 'reset_link'],
      isSystem: true,
    },
    {
      name: 'Email Verification',
      slug: 'email-verification',
      subject: 'Verify Your Email Address',
      bodyHtml: '<p>Hi {first_name}, please verify your email:</p><p><a href="{verify_link}">{verify_link}</a></p>',
      variables: ['first_name', 'verify_link'],
      isSystem: true,
    },
    {
      name: 'Service Suspended',
      slug: 'service-suspended',
      subject: 'Service Suspended — Action Required',
      bodyHtml: '<p>Hi {first_name}, your service {service_name} has been suspended due to an overdue invoice.</p>',
      variables: ['first_name', 'service_name', 'invoice_number', 'amount_due'],
      isSystem: true,
    },
    {
      name: 'Domain Expiry Reminder',
      slug: 'domain-expiry-reminder',
      subject: 'Domain {domain} Expiring Soon',
      bodyHtml: '<p>Hi {first_name}, your domain {domain} expires on {expiry_date}.</p>',
      variables: ['first_name', 'domain', 'expiry_date'],
      isSystem: true,
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { slug: template.slug },
      update: {},
      create: template,
    });
  }

  console.log('✅ Email templates seeded');

  // ─── Default Automation Jobs ───────────────────────────────────────────────
  const automationJobs = [
    { name: 'Generate Invoices', slug: 'generate-invoices', description: 'Generate invoices for due services', schedule: '0 9 * * *', isEnabled: true },
    { name: 'Send Payment Reminders', slug: 'payment-reminders', description: 'Send reminders for overdue invoices', schedule: '0 10 * * *', isEnabled: true },
    { name: 'Suspend Overdue Services', slug: 'suspend-overdue', description: 'Suspend services with overdue invoices', schedule: '0 2 * * *', isEnabled: true },
    { name: 'Domain Expiry Reminders', slug: 'domain-expiry', description: 'Send domain expiry notifications', schedule: '0 8 * * *', isEnabled: true },
    { name: 'Update Exchange Rates', slug: 'exchange-rates', description: 'Fetch latest currency exchange rates', schedule: '0 0 * * *', isEnabled: true },
    { name: 'Prune Notification Logs', slug: 'prune-notification-logs', description: 'Remove old notification logs', schedule: '0 3 1 * *', isEnabled: true },
    { name: 'Prune Audit Logs', slug: 'prune-audit-logs', description: 'Archive old audit logs', schedule: '0 4 1 * *', isEnabled: false },
  ];

  for (const job of automationJobs) {
    await prisma.automationJob.upsert({
      where: { slug: job.slug },
      update: { schedule: job.schedule },
      create: job,
    });
  }

  console.log('✅ Automation jobs seeded');

  // ─── Default Settings ─────────────────────────────────────────────────────
  const settings = [
    { key: 'company_name', value: 'HOP Hosting', group: 'general' },
    { key: 'company_email', value: 'admin@hophosting.com', group: 'general' },
    { key: 'default_currency', value: process.env.DEFAULT_CURRENCY ?? 'USD', group: 'billing' },
    { key: 'invoice_prefix', value: 'INV-', group: 'billing' },
    { key: 'invoice_due_days', value: '14', group: 'billing' },
    { key: 'grace_period_days', value: '3', group: 'billing' },
    { key: 'suspension_days', value: '7', group: 'billing' },
    { key: 'termination_days', value: '14', group: 'billing' },
    { key: 'ticket_prefix', value: 'TKT-', group: 'support' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Settings seeded');

  // ─── Super Admin User ─────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@hop.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'HopAdmin123!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: process.env.SEED_ADMIN_FIRSTNAME ?? 'Super',
        lastName: process.env.SEED_ADMIN_LASTNAME ?? 'Admin',
        role: 'SuperAdmin',
        isEmailVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ SuperAdmin created: ${adminUser.email}`);
  } else {
    console.log(`ℹ️  SuperAdmin already exists: ${adminEmail}`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
