// ─── Types ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type OverallRisk = 'GREEN' | 'AMBER' | 'RED';
export type ContractType = 'NDA' | 'Employment' | 'Vendor' | 'Lease';

export interface Clause {
  id: string;
  category: string;
  text: string;
  riskLevel: RiskLevel;
  riskReason: string;
  plainEnglish: string;
  suggestedRewrite: string;
}

export interface PipelineStage {
  stageNumber: number;
  agentName: string;
  description: string;
  status: 'complete' | 'processing' | 'pending';
}

export interface Contract {
  id: string;
  name: string;
  date: string;
  contractType: ContractType;
  overallRisk: OverallRisk;
  summary: string;
  clauses: Clause[];
  pipelineStages: PipelineStage[];
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

function createPipelineStages(): PipelineStage[] {
  return [
    {
      stageNumber: 1,
      agentName: 'Document Parser',
      description: 'Extracts text, identifies contract type',
      status: 'complete',
    },
    {
      stageNumber: 2,
      agentName: 'Clause Extractor',
      description: 'Segments into discrete clauses',
      status: 'complete',
    },
    {
      stageNumber: 3,
      agentName: 'Risk Scorer',
      description: 'Rates each clause Low / Medium / High',
      status: 'complete',
    },
    {
      stageNumber: 4,
      agentName: 'Plain-English Translator',
      description: 'Converts legal jargon to plain English',
      status: 'complete',
    },
    {
      stageNumber: 5,
      agentName: 'Negotiation Advisor',
      description: 'Suggests specific rewrites',
      status: 'complete',
    },
    {
      stageNumber: 6,
      agentName: 'Summary Agent',
      description: 'Overall verdict and risk score',
      status: 'complete',
    },
  ];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const CONTRACTS: Contract[] = [
  // ── Contract 1: GREEN ────────────────────────────────────────────────────
  {
    id: '1',
    name: 'SmartContract_Audit_v1.sol',
    date: 'May 20, 2026',
    contractType: 'Vendor',
    overallRisk: 'GREEN',
    summary:
      'A generally fair vendor agreement with standard protections. The IP clause could use minor clarification but overall this contract presents low risk.',
    pipelineStages: createPipelineStages(),
    clauses: [
      {
        id: '1-1',
        category: 'Payment Terms',
        text: 'The Client shall remit payment within thirty (30) calendar days of receipt of a valid invoice. Late payments shall accrue interest at a rate of one and one-half percent (1.5%) per month on the outstanding balance.',
        riskLevel: 'LOW',
        riskReason:
          'Standard net-30 payment terms with a reasonable late-payment interest rate that falls within industry norms.',
        plainEnglish:
          'You have 30 days to pay each invoice. If you pay late, you owe 1.5% interest per month on what you still owe.',
        suggestedRewrite:
          'No changes needed. Terms are standard and balanced for both parties.',
      },
      {
        id: '1-2',
        category: 'Liability',
        text: 'In no event shall either party be liable to the other for any indirect, incidental, special, consequential, or punitive damages arising out of or related to this Agreement, regardless of the theory of liability. Each party\'s total cumulative liability shall not exceed the total fees paid under this Agreement during the twelve (12) months preceding the claim.',
        riskLevel: 'LOW',
        riskReason:
          'Mutual liability cap tied to 12 months of fees with exclusion of consequential damages is a fair and standard provision.',
        plainEnglish:
          'Neither side can sue the other for indirect damages. The most either side can owe is the total amount paid in the last 12 months.',
        suggestedRewrite:
          'No changes needed. The mutual liability cap is reasonable and well-balanced.',
      },
      {
        id: '1-3',
        category: 'IP Rights',
        text: 'All intellectual property created by the Vendor in the course of performing services under this Agreement shall be owned by the Vendor until final payment is received, at which point ownership of all deliverables shall transfer to the Client. The Vendor retains the right to use general knowledge, skills, and techniques acquired during the engagement.',
        riskLevel: 'MEDIUM',
        riskReason:
          'IP ownership is conditional on final payment, which could create ambiguity if there are payment disputes. The vendor\'s retained rights to "general knowledge" are vaguely defined.',
        plainEnglish:
          'The vendor owns everything they create until you finish paying. After that, you own the deliverables. The vendor can still use the general skills and know-how they picked up.',
        suggestedRewrite:
          'Clarify that IP transfers upon each milestone payment for completed deliverables rather than only upon final payment. Define "general knowledge and techniques" more precisely to avoid overlap with proprietary deliverables.',
      },
      {
        id: '1-4',
        category: 'Termination',
        text: 'Either party may terminate this Agreement for convenience upon thirty (30) days\' prior written notice. In the event of termination, the Client shall pay for all services rendered and expenses incurred up to the effective date of termination.',
        riskLevel: 'LOW',
        riskReason:
          'Mutual termination right with a reasonable 30-day notice period and fair payment for work completed.',
        plainEnglish:
          'Either side can end the contract with 30 days\' notice, for any reason. You still have to pay for work already done.',
        suggestedRewrite:
          'No changes needed. Termination terms are balanced and straightforward.',
      },
    ],
  },

  // ── Contract 2: AMBER ────────────────────────────────────────────────────
  {
    id: '2',
    name: 'Token_Vesting_Agreement.pdf',
    date: 'May 18, 2026',
    contractType: 'Employment',
    overallRisk: 'AMBER',
    summary:
      'This employment agreement contains a concerning non-compete clause with overly broad scope. Several clauses favor the employer disproportionately. Recommend negotiation on non-compete and IP assignment terms.',
    pipelineStages: createPipelineStages(),
    clauses: [
      {
        id: '2-1',
        category: 'Payment Terms',
        text: 'Employee shall receive a base salary payable in bi-weekly installments. Token-based compensation shall vest over a four (4) year period with a one (1) year cliff. The Company reserves the right to modify the vesting schedule at its sole discretion upon providing sixty (60) days\' written notice to the Employee.',
        riskLevel: 'MEDIUM',
        riskReason:
          'The company\'s unilateral right to modify the vesting schedule undermines the predictability of token compensation. This clause heavily favors the employer.',
        plainEnglish:
          'You get a regular salary every two weeks. Your token compensation builds up over 4 years, but you get nothing if you leave before year one. The company can change the vesting schedule whenever they want with just 60 days\' notice.',
        suggestedRewrite:
          'Remove the company\'s unilateral right to modify the vesting schedule, or require mutual written consent for any changes. Add anti-dilution protections for vested tokens.',
      },
      {
        id: '2-2',
        category: 'Non-Compete',
        text: 'Employee agrees not to engage in any business activity that competes with the Company, directly or indirectly, for a period of twenty-four (24) months following termination, regardless of the reason for termination, within any geographic region where the Company has conducted business.',
        riskLevel: 'HIGH',
        riskReason:
          'A 24-month non-compete with unlimited geographic scope that applies regardless of termination reason is overly broad and may be unenforceable in many jurisdictions.',
        plainEnglish:
          'You cannot work for any competitor for 2 years after leaving, even if they fire you. This applies everywhere the company has ever done business.',
        suggestedRewrite:
          'Limit non-compete to 12 months, direct competitors only, within the employee\'s primary work region.',
      },
      {
        id: '2-3',
        category: 'Liability',
        text: 'Employee shall indemnify and hold harmless the Company, its officers, directors, and affiliates from and against any and all claims, damages, losses, and expenses arising out of or related to Employee\'s performance of duties, including but not limited to errors in code, security vulnerabilities, or data breaches attributable to Employee\'s work product.',
        riskLevel: 'MEDIUM',
        riskReason:
          'The indemnification clause places broad personal liability on the employee for work product defects, which goes beyond typical employment liability standards.',
        plainEnglish:
          'If your work causes any problems — bugs, security issues, data leaks — you could be personally responsible for all the costs and damages. This includes legal fees.',
        suggestedRewrite:
          'Limit employee liability to cases of gross negligence or willful misconduct. Remove indemnification for standard work product defects, which should be covered by employer insurance.',
      },
      {
        id: '2-4',
        category: 'IP Rights',
        text: 'All inventions, discoveries, designs, code, documentation, and other works of authorship created by Employee during the term of employment, whether or not created during working hours or using Company resources, shall be the exclusive property of the Company. Employee hereby assigns all rights, title, and interest in such works to the Company in perpetuity.',
        riskLevel: 'MEDIUM',
        riskReason:
          'The clause claims ownership over all employee creations, including personal projects made outside work hours without company resources, which is overly expansive.',
        plainEnglish:
          'Everything you create while employed — even personal side projects on your own time — belongs to the company forever.',
        suggestedRewrite:
          'Limit IP assignment to inventions created within the scope of employment, during working hours, or using company resources. Explicitly exclude personal projects unrelated to the company\'s business.',
      },
      {
        id: '2-5',
        category: 'Termination',
        text: 'Either party may terminate this Agreement at any time with two (2) weeks\' written notice. Upon termination, all unvested tokens shall be forfeited. Vested tokens shall be subject to a ninety (90) day exercise window.',
        riskLevel: 'LOW',
        riskReason:
          'Two-week notice is standard. The 90-day exercise window for vested tokens is reasonable and provides adequate time for the employee to act.',
        plainEnglish:
          'Either side can end employment with 2 weeks\' notice. You lose any tokens that haven\'t vested yet, but you have 90 days to exercise the ones that have.',
        suggestedRewrite:
          'Consider extending the exercise window to 180 days for employees with more than 2 years of tenure.',
      },
    ],
  },

  // ── Contract 3: RED ──────────────────────────────────────────────────────
  {
    id: '3',
    name: 'LLM_Provider_SLA_Final.docx',
    date: 'May 12, 2026',
    contractType: 'Vendor',
    overallRisk: 'RED',
    summary:
      'This SLA is heavily one-sided in favor of the provider. Multiple clauses contain vague language and unlimited liability exposure. Strongly recommend legal review and substantial renegotiation before signing.',
    pipelineStages: createPipelineStages(),
    clauses: [
      {
        id: '3-1',
        category: 'Payment Terms',
        text: 'Client shall pay all invoices within fifteen (15) calendar days of issuance. The Provider reserves the right to adjust pricing at any time with thirty (30) days\' notice. Failure to pay within the specified period shall result in immediate suspension of all services and a reinstatement fee equal to twenty-five percent (25%) of the outstanding balance.',
        riskLevel: 'HIGH',
        riskReason:
          'Extremely short payment window combined with unilateral pricing changes and a punitive 25% reinstatement fee creates significant financial risk for the client.',
        plainEnglish:
          'You must pay every invoice within 15 days. They can raise prices whenever they want with just 30 days\' notice. If you\'re late, they cut off your service immediately and charge you a 25% penalty to turn it back on.',
        suggestedRewrite:
          'Extend payment terms to net-30. Limit price increases to once annually with a cap tied to CPI. Reduce the reinstatement fee to 5% and provide a 10-day cure period before service suspension.',
      },
      {
        id: '3-2',
        category: 'Liability',
        text: 'The Provider shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to loss of data, loss of revenue, or business interruption, arising from the use or inability to use the services, even if the Provider has been advised of the possibility of such damages. Client assumes all risk associated with the use of the services.',
        riskLevel: 'HIGH',
        riskReason:
          'The provider disclaims all liability including direct damages, leaving the client with zero recourse for service failures, data loss, or business disruption.',
        plainEnglish:
          'If their service breaks, loses your data, or costs you money, they are not responsible for anything — zero liability. You accept all the risk.',
        suggestedRewrite:
          'Add mutual liability provisions. The provider should be liable for direct damages up to the fees paid in the preceding 12 months. Include specific SLA credits for downtime exceeding agreed thresholds.',
      },
      {
        id: '3-3',
        category: 'IP Rights',
        text: 'Any data, prompts, outputs, fine-tuned models, or derivative works generated through the use of the Provider\'s services shall be jointly owned by the Provider and the Client. The Provider retains an irrevocable, worldwide, royalty-free license to use, reproduce, modify, and distribute any such materials for any purpose, including training and improving its own models and services.',
        riskLevel: 'HIGH',
        riskReason:
          'Joint ownership with an irrevocable license effectively gives the provider unrestricted use of all client data and outputs, including for training competing products.',
        plainEnglish:
          'They co-own everything you create using their service — your data, outputs, custom models, all of it. They can use your work to train their AI and even help your competitors, and you can never revoke that right.',
        suggestedRewrite:
          'Client should retain sole ownership of all input data, prompts, and outputs. Remove joint ownership and the irrevocable license. If the provider needs usage rights for service improvement, limit it to anonymized, aggregated data with client opt-in.',
      },
      {
        id: '3-4',
        category: 'Termination',
        text: 'The Provider may terminate this Agreement at any time for any reason with fourteen (14) days\' notice. The Client may terminate with ninety (90) days\' written notice and payment of an early termination fee equal to the remaining contract value. Upon termination by either party, the Provider shall have no obligation to return or migrate Client data.',
        riskLevel: 'MEDIUM',
        riskReason:
          'Asymmetric termination rights strongly favor the provider. The early termination fee and lack of data portability obligations create significant vendor lock-in.',
        plainEnglish:
          'They can cancel on you with just 14 days\' notice, for any reason. If you want to leave, you need to give 90 days\' notice and pay for the rest of the contract. When it ends, they don\'t have to give your data back.',
        suggestedRewrite:
          'Make termination rights symmetric — both parties get 30 days\' notice. Remove the early termination fee or cap it at 2 months\' fees. Require the provider to export all client data in a standard format within 30 days of termination.',
      },
      {
        id: '3-5',
        category: 'Non-Compete',
        text: 'During the term of this Agreement and for a period of eighteen (18) months following termination, the Client shall not develop, deploy, or invest in any artificial intelligence or machine learning platform that provides services substantially similar to those offered by the Provider. This restriction applies to the Client and all of its subsidiaries, affiliates, and successors.',
        riskLevel: 'HIGH',
        riskReason:
          'A vendor-imposed non-compete preventing the client from building or investing in competing AI services is extremely unusual and severely limits the client\'s strategic flexibility.',
        plainEnglish:
          'While using their service and for 18 months after, you and all your subsidiaries are banned from building, using, or investing in any competing AI platform. They\'re essentially locking you out of the AI market.',
        suggestedRewrite:
          'Remove the non-compete clause entirely. Vendor agreements should not restrict a client\'s ability to develop or invest in competing technologies. If the provider insists, limit it to directly replicating the provider\'s proprietary architecture.',
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAllContracts(): Contract[] {
  return CONTRACTS;
}

export function getContractById(id: string): Contract | undefined {
  return CONTRACTS.find((contract) => contract.id === id);
}
