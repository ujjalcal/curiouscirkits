import "dotenv/config";
import {
  Route53DomainsClient,
  CheckDomainAvailabilityCommand,
  RegisterDomainCommand,
  GetOperationDetailCommand,
} from "@aws-sdk/client-route-53-domains";
import {
  Route53Client,
  CreateHostedZoneCommand,
  ChangeResourceRecordSetsCommand,
  ListHostedZonesByNameCommand,
  DeleteHostedZoneCommand,
} from "@aws-sdk/client-route-53";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const VERCEL_IP = "76.76.21.21"; // Vercel's A record IP

const domainsClient = new Route53DomainsClient({ region: "us-east-1" }); // Route 53 Domains is us-east-1 only
const route53Client = new Route53Client({ region: AWS_REGION });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(label: string, data: unknown) {
  console.log(`\n[${ label }]`);
  console.log(JSON.stringify(data, null, 2));
}

function fail(msg: string): never {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

async function cfFetch(path: string, options: RequestInit = {}) {
  if (!CF_API_TOKEN) fail("CLOUDFLARE_API_TOKEN not set");
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) {
    log("Cloudflare Error", json.errors);
    fail(`Cloudflare API failed: ${path}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Phase 1: Free validation (no domain purchase)
// ---------------------------------------------------------------------------

async function checkAvailability(domain: string) {
  console.log(`\nChecking availability of: ${domain}`);
  const result = await domainsClient.send(
    new CheckDomainAvailabilityCommand({ DomainName: domain })
  );
  log("Route 53 Availability", {
    domain,
    availability: result.Availability,
  });
  return result.Availability;
}

async function createRoute53HostedZone(domain: string) {
  console.log(`\nCreating Route 53 hosted zone for: ${domain}`);
  const result = await route53Client.send(
    new CreateHostedZoneCommand({
      Name: domain,
      CallerReference: `spike-${Date.now()}`,
      HostedZoneConfig: {
        Comment: "Domain spike test zone",
      },
    })
  );
  const zoneId = result.HostedZone?.Id?.replace("/hostedzone/", "");
  const nameservers = result.DelegationSet?.NameServers || [];
  log("Route 53 Hosted Zone Created", {
    zoneId,
    nameservers,
    domain,
  });
  return { zoneId, nameservers };
}

async function addRoute53Record(zoneId: string, domain: string, ip: string) {
  console.log(`\nAdding A record: ${domain} -> ${ip}`);
  await route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: domain,
              Type: "A",
              TTL: 300,
              ResourceRecords: [{ Value: ip }],
            },
          },
        ],
      },
    })
  );
  log("A Record Added", { domain, ip, zoneId });
}

async function createCloudflareZone(domain: string) {
  if (!CF_ACCOUNT_ID) fail("CLOUDFLARE_ACCOUNT_ID not set");
  console.log(`\nCreating Cloudflare zone for: ${domain}`);
  const json = await cfFetch("/zones", {
    method: "POST",
    body: JSON.stringify({
      name: domain,
      account: { id: CF_ACCOUNT_ID },
      type: "full",
    }),
  });
  const zone = json.result;
  log("Cloudflare Zone Created", {
    zoneId: zone.id,
    nameservers: zone.name_servers,
    status: zone.status,
    domain,
  });
  return { zoneId: zone.id, nameservers: zone.name_servers };
}

async function addCloudflareRecord(zoneId: string, domain: string, ip: string) {
  console.log(`\nAdding Cloudflare A record: ${domain} -> ${ip}`);
  const json = await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: domain,
      content: ip,
      ttl: 1, // auto
      proxied: true,
    }),
  });
  log("Cloudflare A Record Added", {
    recordId: json.result.id,
    domain,
    ip,
    proxied: true,
  });
}

async function deleteRoute53HostedZone(zoneId: string, domain: string) {
  console.log(`\nCleaning up Route 53 hosted zone: ${zoneId}`);
  // Must delete non-default record sets first
  try {
    await route53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: "DELETE",
              ResourceRecordSet: {
                Name: domain,
                Type: "A",
                TTL: 300,
                ResourceRecords: [{ Value: VERCEL_IP }],
              },
            },
          ],
        },
      })
    );
  } catch {
    // Record may not exist, that's fine
  }
  await route53Client.send(new DeleteHostedZoneCommand({ Id: zoneId }));
  log("Route 53 Zone Deleted", { zoneId });
}

async function deleteCloudflareZone(domain: string) {
  console.log(`\nCleaning up Cloudflare zone for: ${domain}`);
  // Find zone ID
  const json = await cfFetch(`/zones?name=${domain}`);
  const zone = json.result?.[0];
  if (!zone) {
    console.log("  No zone found, nothing to clean up.");
    return;
  }
  await cfFetch(`/zones/${zone.id}`, { method: "DELETE" });
  log("Cloudflare Zone Deleted", { zoneId: zone.id, domain });
}

// ---------------------------------------------------------------------------
// Phase 2: Real purchase (costs $2-12)
// ---------------------------------------------------------------------------

async function registerDomain(domain: string) {
  console.log(`\n*** REAL PURCHASE: Registering ${domain} ***`);
  console.log("This will charge your AWS account.\n");

  const contact = {
    FirstName: "CuriousCirkits",
    LastName: "Platform",
    ContactType: "COMPANY" as const,
    OrganizationName: "CuriousCirkits",
    AddressLine1: "123 Test Street",
    City: "Portland",
    State: "OR",
    CountryCode: "US" as const,
    ZipCode: "97201",
    PhoneNumber: "+1.5551234567",
    Email: "domains@curiouscirkits.com",
  };

  const result = await domainsClient.send(
    new RegisterDomainCommand({
      DomainName: domain,
      DurationInYears: 1,
      AutoRenew: false,
      AdminContact: contact,
      RegistrantContact: contact,
      TechContact: contact,
      PrivacyProtectAdminContact: true,
      PrivacyProtectRegistrantContact: true,
      PrivacyProtectTechContact: true,
    })
  );

  log("Domain Registration Initiated", {
    operationId: result.OperationId,
    domain,
  });
  return result.OperationId;
}

async function checkRegistrationStatus(operationId: string) {
  const result = await domainsClient.send(
    new GetOperationDetailCommand({ OperationId: operationId })
  );
  log("Registration Status", {
    operationId,
    status: result.Status,
    type: result.Type,
    domain: result.DomainName,
    message: result.Message,
  });
  return result.Status;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function runPhase1(domain: string) {
  console.log("=".repeat(60));
  console.log("PHASE 1: Free validation (no purchase)");
  console.log("=".repeat(60));

  // Step 1: Check availability via Route 53
  const availability = await checkAvailability(domain);
  console.log(`  -> ${domain} is ${availability}`);

  // Step 2: Create Route 53 hosted zone (proves AWS DNS API works)
  const r53Zone = await createRoute53HostedZone(domain);

  // Step 3: Add A record in Route 53 (proves record management)
  await addRoute53Record(r53Zone.zoneId!, domain, VERCEL_IP);

  // Step 4: Create Cloudflare zone (proves CF API works)
  const cfZone = await createCloudflareZone(domain);

  // Step 5: Add A record in Cloudflare (proves CF DNS management)
  await addCloudflareRecord(cfZone.zoneId, domain, VERCEL_IP);

  console.log("\n" + "=".repeat(60));
  console.log("PHASE 1 RESULTS");
  console.log("=".repeat(60));
  console.log(`  Route 53 availability check: OK`);
  console.log(`  Route 53 hosted zone: ${r53Zone.zoneId}`);
  console.log(`  Route 53 A record: ${domain} -> ${VERCEL_IP}`);
  console.log(`  Cloudflare zone: ${cfZone.zoneId}`);
  console.log(`  Cloudflare nameservers: ${cfZone.nameservers.join(", ")}`);
  console.log(`  Cloudflare A record: ${domain} -> ${VERCEL_IP} (proxied)`);
  console.log("");
  console.log("  ALL API INTEGRATIONS WORKING.");
  console.log("  To complete the chain, run: npx tsx spike.ts register <domain>");
  console.log("");

  return { r53Zone, cfZone };
}

async function runCleanup(domain: string) {
  console.log("=".repeat(60));
  console.log("CLEANUP: Removing test zones");
  console.log("=".repeat(60));

  // Find and delete Route 53 zone
  const r53Zones = await route53Client.send(
    new ListHostedZonesByNameCommand({ DNSName: domain, MaxItems: 1 })
  );
  const r53Zone = r53Zones.HostedZones?.find((z) => z.Name === `${domain}.`);
  if (r53Zone) {
    const zoneId = r53Zone.Id?.replace("/hostedzone/", "");
    if (zoneId) await deleteRoute53HostedZone(zoneId, domain);
  } else {
    console.log("  No Route 53 zone found.");
  }

  // Delete Cloudflare zone
  await deleteCloudflareZone(domain);

  console.log("\n  Cleanup complete.");
}

async function runRegister(domain: string) {
  console.log("=".repeat(60));
  console.log("PHASE 2: Real domain purchase");
  console.log("=".repeat(60));

  // Step 1: Register domain
  const operationId = await registerDomain(domain);

  // Step 2: Poll registration status
  if (operationId) {
    console.log("\nPolling registration status (may take a few minutes)...");
    let status = "IN_PROGRESS";
    let attempts = 0;
    while (status === "IN_PROGRESS" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 10000)); // wait 10s
      status = (await checkRegistrationStatus(operationId)) || "UNKNOWN";
      attempts++;
      console.log(`  Attempt ${attempts}: ${status}`);
    }

    if (status === "SUCCESSFUL") {
      console.log(`\n  Domain ${domain} registered successfully!`);
      console.log("  Next: set nameservers to Cloudflare and verify resolution.");
    } else {
      console.log(`\n  Registration status: ${status}`);
      console.log("  Check AWS console for details.");
    }
  }
}

async function runVerify(domain: string) {
  console.log("=".repeat(60));
  console.log("VERIFY: Checking DNS resolution");
  console.log("=".repeat(60));

  console.log(`\nRun these commands manually to verify:\n`);
  console.log(`  # Check nameservers`);
  console.log(`  dig NS ${domain}`);
  console.log("");
  console.log(`  # Check A record via Cloudflare`);
  console.log(`  dig @ns1.cloudflare.com ${domain}`);
  console.log("");
  console.log(`  # Check in browser`);
  console.log(`  curl -I https://${domain}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const [command, domain] = process.argv.slice(2);

if (!command || !domain) {
  console.log(`
Domain Purchase Spike - CuriousCirkits
=======================================

Usage:
  npx tsx spike.ts phase1 <domain>     Phase 1: free API validation (no purchase)
  npx tsx spike.ts cleanup <domain>    Delete test zones created by phase1
  npx tsx spike.ts register <domain>   Phase 2: REAL purchase (costs money!)
  npx tsx spike.ts check <domain>      Check domain availability only
  npx tsx spike.ts verify <domain>     Print verification commands

Examples:
  npx tsx spike.ts phase1 test-cirkits.xyz
  npx tsx spike.ts cleanup test-cirkits.xyz
  npx tsx spike.ts register test-cirkits.xyz
`);
  process.exit(0);
}

switch (command) {
  case "phase1":
    await runPhase1(domain);
    break;
  case "cleanup":
    await runCleanup(domain);
    break;
  case "check":
    await checkAvailability(domain);
    break;
  case "register":
    await runRegister(domain);
    break;
  case "verify":
    await runVerify(domain);
    break;
  default:
    fail(`Unknown command: ${command}. Use phase1, cleanup, check, register, or verify.`);
}
