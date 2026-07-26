#!/usr/bin/env python3
"""REV — Product & Business Document. Generates a print-ready PDF."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable, NextPageTemplate,
)

# ---------------------------------------------------------------- palette
INK      = colors.HexColor('#191713')
IVORY    = colors.HexColor('#F6F3EC')
COPPER   = colors.HexColor('#A64B2A')
PETROL   = colors.HexColor('#33627A')
MOSS     = colors.HexColor('#2F6B4F')
MUTED    = colors.HexColor('#6B6558')
HAIRLINE = colors.HexColor('#D8D2C4')
WASH     = colors.HexColor('#EFEBE0')
AMBER    = colors.HexColor('#8A6D1F')

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ---------------------------------------------------------------- styles
ss = getSampleStyleSheet()

def mk(name, **kw):
    base = kw.pop('parent', ss['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

S = {
    'h1': mk('h1', fontName='Times-Bold', fontSize=21, leading=25, textColor=INK,
             spaceBefore=0, spaceAfter=3),
    'eyebrow': mk('eyebrow', fontName='Helvetica-Bold', fontSize=7.5, leading=10,
                  textColor=COPPER, spaceAfter=5),
    'h2': mk('h2', fontName='Times-Bold', fontSize=13.5, leading=17, textColor=INK,
             spaceBefore=13, spaceAfter=5),
    'h3': mk('h3', fontName='Helvetica-Bold', fontSize=9.8, leading=13, textColor=INK,
             spaceBefore=9, spaceAfter=3),
    'body': mk('body', fontName='Times-Roman', fontSize=10, leading=14.6,
               textColor=INK, spaceAfter=7, alignment=TA_LEFT),
    'lead': mk('lead', fontName='Times-Roman', fontSize=11.3, leading=16.4,
               textColor=colors.HexColor('#37322A'), spaceAfter=9),
    'small': mk('small', fontName='Helvetica', fontSize=8.2, leading=11.6,
                textColor=MUTED, spaceAfter=5),
    'cap': mk('cap', fontName='Helvetica-Oblique', fontSize=8, leading=11,
              textColor=MUTED, spaceAfter=8),
    'th': mk('th', fontName='Helvetica-Bold', fontSize=8, leading=10.5, textColor=INK),
    'thw': mk('thw', fontName='Helvetica-Bold', fontSize=8, leading=10.5, textColor=IVORY),
    'td': mk('td', fontName='Times-Roman', fontSize=8.8, leading=12, textColor=INK),
    'tdb': mk('tdb', fontName='Times-Bold', fontSize=8.8, leading=12, textColor=INK),
    'tdm': mk('tdm', fontName='Times-Roman', fontSize=8.4, leading=11.4, textColor=MUTED),
    'quote': mk('quote', fontName='Times-Italic', fontSize=11, leading=15.5,
                textColor=COPPER, spaceBefore=4, spaceAfter=10, leftIndent=10),
}

def P(t, s='body'):   return Paragraph(t, S[s])
def H2(t):            return Paragraph(t, S['h2'])
def H3(t):            return Paragraph(t, S['h3'])

def bullets(items, style='body', bullet_col=COPPER):
    return ListFlowable(
        [ListItem(Paragraph(i, S[style]), leftIndent=12) for i in items],
        bulletType='bullet', start='•', leftIndent=13, bulletFontSize=8,
        bulletColor=bullet_col, spaceAfter=6,
    )

def rule(col=HAIRLINE, w=0.6, before=2, after=8):
    return HRFlowable(width='100%', thickness=w, color=col,
                      spaceBefore=before, spaceAfter=after)

def callout(title, body, accent=COPPER, bg=WASH):
    inner = [Paragraph(f'<b>{title}</b>', mk('ct', fontName='Helvetica-Bold', fontSize=8.6,
                                             leading=11.5, textColor=accent, spaceAfter=3))]
    for b in ([body] if isinstance(body, str) else body):
        inner.append(Paragraph(b, mk('cb', fontName='Times-Roman', fontSize=9.2,
                                     leading=13.2, textColor=INK, spaceAfter=3)))
    t = Table([[inner]], colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),   ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBEFORE', (0,0), (0,-1), 2.2, accent),
    ]))
    return t

def table(rows, widths, header=True, zebra=True, align=None):
    """Header cells are built light-on-dark up front. Building them first
    matters: mutating the data list after Table() has been constructed does
    not reach the rendered output."""
    data = []
    for r_i, row in enumerate(rows):
        out = []
        for cell in row:
            if not isinstance(cell, str):
                out.append(cell)
            elif header and r_i == 0:
                out.append(Paragraph(cell, S['thw']))
            else:
                out.append(Paragraph(cell, S['td']))
        data.append(out)

    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 7), ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ('TOPPADDING', (0,0), (-1,-1), 6),  ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-2), 0.4, HAIRLINE),
    ]
    if header:
        style += [('BACKGROUND', (0,0), (-1,0), INK),
                  ('TOPPADDING', (0,0), (-1,0), 7),
                  ('BOTTOMPADDING', (0,0), (-1,0), 7)]
    if zebra:
        for i in range(1, len(rows)):
            if i % 2 == 0:
                style.append(('BACKGROUND', (0,i), (-1,i), colors.HexColor('#FAF8F2')))
    if align:
        for col, a in align.items():
            style.append(('ALIGN', (col,0), (col,-1), a))
    t.setStyle(TableStyle(style))
    return t

# ---------------------------------------------------------------- chrome
def cover(canv, doc):
    canv.saveState()
    canv.setFillColor(INK)
    canv.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    canv.setFillColor(COPPER)
    canv.rect(0, PAGE_H - 6*mm, PAGE_W, 6*mm, stroke=0, fill=1)

    canv.setFillColor(IVORY)
    canv.setFont('Times-Bold', 62)
    canv.drawString(MARGIN, PAGE_H - 78*mm, 'REV')
    canv.setFillColor(COPPER)
    canv.circle(MARGIN + 62*mm, PAGE_H - 76*mm, 3.4*mm, stroke=0, fill=1)

    canv.setFillColor(IVORY)
    canv.setFont('Times-Roman', 17)
    canv.drawString(MARGIN, PAGE_H - 92*mm, 'Product & Business Document')

    canv.setFont('Helvetica', 9.5)
    canv.setFillColor(colors.HexColor('#B9B2A3'))
    canv.drawString(MARGIN, PAGE_H - 101*mm,
                    'A verified rider and driver community for India')

    canv.setStrokeColor(colors.HexColor('#3A342B'))
    canv.setLineWidth(0.7)
    canv.line(MARGIN, PAGE_H - 112*mm, PAGE_W - MARGIN, PAGE_H - 112*mm)

    canv.setFont('Times-Italic', 13)
    canv.setFillColor(colors.HexColor('#D9D3C6'))
    for i, ln in enumerate([
        'An online platform that connects riders to each other.',
        'It does not organise rides. It makes them findable, and',
        'it makes the people on them accountable.',
    ]):
        canv.drawString(MARGIN, PAGE_H - (124 + i*7.4)*mm, ln)

    rows = [('PREPARED FOR', 'Founder, REV'),
            ('DATE', '26 July 2026'),
            ('STATUS', 'Platform built and verified · pre-launch'),
            ('LAUNCH MARKET', 'Chennai, Tamil Nadu')]
    y = 58*mm
    for k, v in rows:
        canv.setFont('Helvetica-Bold', 7)
        canv.setFillColor(COPPER)
        canv.drawString(MARGIN, y, k)
        canv.setFont('Helvetica', 9)
        canv.setFillColor(IVORY)
        canv.drawString(MARGIN + 34*mm, y, v)
        y -= 7.5*mm

    canv.setFont('Helvetica', 7)
    canv.setFillColor(colors.HexColor('#6E685C'))
    canv.drawString(MARGIN, 16*mm,
        'Internal strategy document. Financial figures are illustrative models to be validated, not forecasts.')
    canv.restoreState()

def chrome(canv, doc):
    canv.saveState()
    canv.setFillColor(IVORY)
    canv.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canv.setFillColor(COPPER)
    canv.rect(0, PAGE_H - 3*mm, PAGE_W, 3*mm, stroke=0, fill=1)

    canv.setFont('Times-Bold', 10)
    canv.setFillColor(INK)
    canv.drawString(MARGIN, PAGE_H - 12*mm, 'REV')
    canv.setFont('Helvetica', 7.2)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN + 12*mm, PAGE_H - 12*mm, 'Product & Business Document')

    canv.setStrokeColor(HAIRLINE)
    canv.setLineWidth(0.5)
    canv.line(MARGIN, PAGE_H - 15*mm, PAGE_W - MARGIN, PAGE_H - 15*mm)
    canv.line(MARGIN, 14*mm, PAGE_W - MARGIN, 14*mm)

    canv.setFont('Helvetica', 7.2)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN, 10*mm, 'Confidential — internal')
    canv.drawRightString(PAGE_W - MARGIN, 10*mm, str(canv.getPageNumber() - 1))
    canv.restoreState()

# ---------------------------------------------------------------- content
def build(path):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=22*mm, bottomMargin=20*mm,
                          title='REV — Product & Business Document',
                          author='REV', subject='Product strategy and business model')
    fw = PAGE_W - 2*MARGIN
    frame = Frame(MARGIN, 20*mm, fw, PAGE_H - 42*mm, id='f')
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[Frame(0,0,PAGE_W,PAGE_H,id='c')], onPage=cover),
        PageTemplate(id='body',  frames=[frame], onPage=chrome),
    ])

    F = []           # story
    def sec(num, title):
        F.append(Paragraph(f'SECTION {num}', S['eyebrow']))
        F.append(Paragraph(title, S['h1']))
        F.append(rule(INK, 1.1, 3, 11))

    # page 1 uses the cover template; everything after it uses the body one
    F.append(NextPageTemplate('body'))
    F.append(PageBreak())

    # ---------------------------------------------------- executive summary
    sec('01', 'Executive summary')
    F.append(P('REV is an online platform where verified motorcycle and car owners in India '
        'find each other and organise group rides. It is a <b>bridge, not a tour operator</b>. '
        'Members create the rides; REV makes them findable and makes the people on them '
        'accountable.', 'lead'))

    F.append(callout('The decision that shapes everything else',
        'You will not be physically present at rides. Treat that as the design principle, not a '
        'limitation. A platform that connects people is an <b>intermediary</b>; a platform that '
        'runs rides is an <b>organiser</b>. The first is defensible, scalable and cheap to operate. '
        'The second carries duty of care, needs insurance and staff in every city, and does not '
        'scale. Everything in this document assumes the first, and Section 02 sets out the lines '
        'that must not be crossed to stay there.'))

    F.append(H2('Where the product stands'))
    F.append(P('The platform is built and verified. Phone-verified identity, member profiles, a '
        'vehicle Garage, ride creation with real road routing, rosters with capacity control, '
        'ride-scoped chat, reporting and blocking, an SOS path with emergency contacts, and a '
        'membership structure. The database enforces its own rules — a member cannot read '
        'another member\'s phone number or date of birth, cannot self-verify, cannot join a full '
        'ride, and cannot see a ride\'s exact meeting point until they have joined it. Those are '
        'not policies in a document; they are constraints the database refuses to break.'))

    F.append(H2('What it needs before launch'))
    F.append(table([
        ['Item', 'Why it blocks launch', 'Effort'],
        ['SMS provider (DLT-registered sender)', 'Phone verification is the product\'s foundation. Nothing works without it.', 'Days — external'],
        ['Registered company', 'Gates the payment gateway, the DLT registration and the legal pages.', 'Weeks — external'],
        ['Legal review of Terms and Privacy', 'Drafts exist. A lawyer must review before real members or money.', 'Weeks — external'],
        ['Payment gateway', 'Only needed when paid membership switches on — not for launch.', 'Days — external'],
        ['Ride captain recruitment', 'Twenty to thirty real captains. This is the actual launch work.', 'Weeks — yours'],
    ], [fw*0.30, fw*0.50, fw*0.20]))
    F.append(Paragraph('Every blocker is external or commercial. None is engineering.', S['cap']))

    F.append(H2('The commercial thesis in one paragraph'))
    F.append(P('Community platforms rarely get rich on member subscriptions alone — Indian '
        'consumer willingness to pay for a hobby app is low, and conversion in the low single '
        'digits is the honest planning assumption. The money is in <b>who wants access to a '
        'verified, high-intent motoring audience</b>: manufacturers, dealerships, tyre and gear '
        'brands, service chains, insurers and highway businesses. Subscriptions are how you prove '
        'the audience is real and engaged. Partnerships are how you monetise it. Build for the '
        'first, plan for the second.', 'lead'))

    F.append(PageBreak())

    # ---------------------------------------------------- positioning
    sec('02', 'Positioning: bridge, not organiser')
    F.append(P('This section matters more than the product roadmap, because getting it wrong is '
        'the one mistake that cannot be undone by shipping features.', 'lead'))

    F.append(H2('Why an intermediary is the right posture'))
    F.append(P('Indian law treats a platform that merely hosts what its users publish very '
        'differently from one that provides the underlying service. An intermediary that does not '
        'initiate the transmission, does not select the participants, and does not modify the '
        'content has a recognised safe-harbour position, provided it observes due diligence and '
        'acts on complaints. The moment REV picks the route, appoints the leader, charges for the '
        'ride, or promises the experience, that protection weakens and REV starts to look like the '
        'party responsible for what happens on the road.'))

    F.append(callout('Lines that must not be crossed', [
        '<b>Never take money for a specific ride.</b> Membership is a fee for access to the '
        'platform. A per-ride fee is payment for an experience, and that makes you its seller.',
        '<b>Never appoint or employ ride leaders.</b> Captains are members who chose to lead. '
        'They are not your staff, your agents, or "REV-certified guides".',
        '<b>Never publish a route as recommended, safe, or approved by REV.</b> Routes are '
        'member-authored content that REV displays.',
        '<b>Never call REV the organiser</b> — not in the app, not in marketing, not in a caption. '
        'The word matters if it is ever read back to you.',
    ], accent=COPPER, bg=colors.HexColor('#F3E7E1')))

    F.append(H2('What you must do instead of being present'))
    F.append(P('Absence is only defensible if the platform demonstrably does the things a '
        'responsible intermediary does. These are your obligations, and they are also your '
        'product differentiators — the same work that limits liability is what makes REV worth '
        'joining.'))
    F.append(table([
        ['Instead of being there', 'The platform does this'],
        ['Vetting who turns up',
         'Phone verification for every member, with licence and registration checks as a higher tier. Identity is the product.'],
        ['Watching behaviour on the road',
         'Reporting and blocking built into every profile and ride. Reports are recorded, reviewed and acted on within a stated window.'],
        ['Being reachable in an emergency',
         'An SOS path that shares live location with the member\'s own nominated contacts — not with REV, and not with strangers.'],
        ['Setting the safety standard',
         'A published Ride Charter every captain accepts before creating a ride: gear, formation, pace, no racing, no impairment.'],
        ['Knowing who is accountable',
         'Every ride has a named, verified captain. Every roster is a list of real, contactable people. Nobody is anonymous.'],
    ], [fw*0.30, fw*0.70]))

    F.append(H2('The captain is your operating model'))
    F.append(P('You cannot be at every ride, but a captain is at every ride by definition. Captains '
        'are the layer that makes an absent platform work: they set the pace, hold the roster, and '
        'own the brief. Your job is to make being a captain feel like status worth having — '
        'visible standing, a track record, first access, eventually a share of what their community '
        'generates. Recruit and retain thirty good captains and the platform runs itself. Fail to, '
        'and no amount of product will save it.'))

    F.append(PageBreak())

    # ---------------------------------------------------- how it functions
    sec('03', 'How the platform functions')

    F.append(H2('The core loop'))
    F.append(table([
        ['', 'Step', 'What happens', 'Why it matters'],
        ['1', 'Verify', 'A one-time password to an Indian mobile number. One account per number.',
         'Removes throwaway accounts. This is the entire moat.'],
        ['2', 'Build a Garage', 'Make, model, year, modifications, photographs, riding style.',
         'Identity worth having. Gives members a reason to return before any ride exists.'],
        ['3', 'Find or lead', 'Browse rides by city and world, or create one as captain.',
         'Supply and demand in the same screen.'],
        ['4', 'Join', 'RSVP takes a seat. Capacity is enforced by the database, not the interface.',
         'A roster that is actually true. No overbooking, no ghosts.'],
        ['5', 'Coordinate', 'Ride-scoped chat, visible only to people who joined.',
         'Replaces the WhatsApp group, with a verified roster attached.'],
        ['6', 'Meet', 'Exact meeting point is released only to confirmed riders, close to the time.',
         'A public listing never reveals where a named person will be.'],
        ['7', 'Record', 'The ride completes; it counts toward the member\'s record.',
         'Turns participation into standing, which is what people come back for.'],
    ], [fw*0.05, fw*0.15, fw*0.42, fw*0.38]))

    F.append(H2('Two worlds, one platform'))
    F.append(P('REV runs as two parallel communities — two-wheeler and four-wheeler — sharing one '
        'account, one Garage and one reputation. They behave differently: motorcycle rides are '
        'frequent, early-morning and social; car drives are rarer, longer and more planned. '
        'Keeping them visually and editorially distinct while sharing infrastructure means one '
        'platform serves two audiences without either feeling like a guest in the other\'s house.'))

    F.append(H2('What the platform deliberately does not do'))
    F.append(bullets([
        '<b>It does not take payment for rides.</b> Money moves between members offline, or not '
        'at all. See Section 02.',
        '<b>It does not track members during a ride.</b> Live location exists only inside an '
        'active SOS, and it goes to the member\'s own contacts.',
        '<b>It does not show phone numbers.</b> Ever, to anyone, on any screen. It is the '
        'promise most communities break first.',
        '<b>It does not rank or score members publicly.</b> Rides logged, yes. A public rating '
        'out of five turns a community into a marketplace and invites gaming.',
    ]))

    F.append(PageBreak())

    # ---------------------------------------------------- revenue
    sec('04', 'How REV makes money')
    F.append(P('Five streams, ordered by how quickly they can realistically produce revenue and '
        'how well each fits an intermediary that is not present at rides.', 'lead'))

    F.append(H3('1 · Membership subscriptions — the base'))
    F.append(P('A free tier that is genuinely useful, and a paid tier that pays for itself. This '
        'is the stream you control entirely and the one that proves the audience is real. Expect '
        'low single-digit conversion; design the paid tier so the members who do convert are the '
        'ones who ride most and evangelise hardest. Section 06 covers what actually makes someone '
        'pay.'))

    F.append(H3('2 · Brand and dealer partnerships — the real business'))
    F.append(P('A verified, geolocated, high-intent motoring audience is valuable to people who '
        'sell to riders: manufacturers launching a model, dealerships wanting test rides, tyre and '
        'oil brands, gear retailers, service chains. This is not banner advertising — it is '
        'sponsored rides, launch experiences, and a place in the Garage when a member records what '
        'they own. It requires scale in one city before it is sellable, which is why density beats '
        'breadth.'))

    F.append(H3('3 · Commerce and affiliate — the margin'))
    F.append(P('Gear, accessories, tyres, servicing, roadside cover and two-wheeler insurance are '
        'all things this audience buys anyway. A member who has recorded their exact machine in the '
        'Garage is the best-qualified lead a parts seller will ever get. Referral economics require '
        'no inventory, no logistics and no liability.'))

    F.append(H3('4 · Highway and hospitality partners — the local flywheel'))
    F.append(P('Cafés, breakfast stops and resorts on popular corridors want groups of fifteen '
        'arriving on a Sunday morning. A listing fee or a per-visit arrangement is small money per '
        'partner but recurring, hyperlocal, and it makes routes better for members. It also gives '
        'captains something to offer their riders.'))

    F.append(H3('5 · Club and organiser tooling — the B2B option'))
    F.append(P('Existing riding clubs, dealership owners\' groups and event organisers already run '
        'this coordination badly on WhatsApp. Selling them a private space on REV — their roster, '
        'their rides, their branding — is higher revenue per account and far lower support cost '
        'than consumer subscriptions. Worth testing once the consumer product has proven itself.'))

    F.append(Spacer(1, 5))
    F.append(table([
        ['Stream', 'Time to revenue', 'Effort', 'Ceiling', 'Fits "not present"?'],
        ['Membership', 'Immediate at launch', 'Low', 'Moderate', 'Yes'],
        ['Brand & dealer partnerships', 'After density in one city', 'High — sales work', 'High', 'Yes'],
        ['Commerce & affiliate', 'Early, once Garage data exists', 'Low', 'Moderate', 'Yes'],
        ['Highway & hospitality', 'Early, hyperlocal', 'Medium', 'Low per partner', 'Yes'],
        ['Club & organiser tooling', 'After consumer proof', 'Medium', 'High per account', 'Yes'],
    ], [fw*0.24, fw*0.21, fw*0.17, fw*0.16, fw*0.22]))

    F.append(callout('The stream to avoid',
        'Charging a commission on a ride. It is the most obvious idea and the most dangerous one: '
        'it converts REV from a platform that lists rides into a business that sells them, with '
        'everything that follows in tax, liability and consumer-protection terms. If money must '
        'move for a ride, let it move between members and stay out of it.',
        accent=AMBER, bg=colors.HexColor('#F5EFDD')))

    F.append(PageBreak())

    # ---------------------------------------------------- unit economics
    sec('05', 'Illustrative economics')
    F.append(callout('Read these as models, not forecasts',
        'Every number below is an assumption chosen to show how the model behaves, not a '
        'prediction. The purpose is to identify which variable matters most — and it is not price. '
        'Replace each figure with a measured one as soon as you have it.',
        accent=PETROL, bg=colors.HexColor('#E4EDF2')))

    F.append(H2('Cost to operate'))
    F.append(P('The platform is deliberately cheap to run. Managed database and authentication, a '
        'static frontend, free mapping and routing, and per-message SMS. At launch scale the '
        'infrastructure is close to free; SMS is the only cost that grows with signups, and it '
        'grows with <i>verifications</i>, not with usage.'))
    F.append(table([
        ['Cost line', 'At ~500 members', 'At ~5,000 members', 'Note'],
        ['Database & auth hosting', 'Free tier', 'Low monthly tier', 'Scales in steps, not linearly'],
        ['Frontend hosting', 'Free tier', 'Free to low', 'Static assets on a CDN'],
        ['Maps & routing', 'Free', 'Free', 'Open tiles and open routing'],
        ['SMS verification', 'Per signup only', 'Per signup only', 'The only truly variable cost'],
        ['Payment gateway', 'Percentage of collections', 'Percentage of collections', 'Only on paid members'],
        ['Moderation & support', 'Your time', 'First hire', 'The real cost at scale'],
    ], [fw*0.26, fw*0.22, fw*0.22, fw*0.30]))
    F.append(Paragraph('The honest conclusion: technology is not your cost problem. '
                       'Attention and moderation are.', S['cap']))

    F.append(H2('What conversion has to do'))
    F.append(P('The model below holds price constant and varies only the two things you actually '
        'control — how many members you have, and what fraction of them pay. It shows why chasing '
        'a higher price is the wrong instinct.'))
    F.append(table([
        ['Members in city', 'Paying at 3%', 'Paying at 6%', 'Paying at 10%'],
        ['500',    '15 members',  '30 members',  '50 members'],
        ['2,000',  '60 members',  '120 members', '200 members'],
        ['5,000',  '150 members', '300 members', '500 members'],
        ['15,000', '450 members', '900 members', '1,500 members'],
    ], [fw*0.25]*4, align={1:'CENTER',2:'CENTER',3:'CENTER'}))
    F.append(P('At any plausible subscription price, a few hundred paying members in one city is a '
        'side income, not a company. That is not an argument against subscriptions — it is the '
        'argument for why subscriptions are the <i>proof</i>, and partnerships are the '
        '<i>business</i>. A brand paying for access to five thousand verified, active riders in '
        'Chennai is a materially larger cheque than those riders will ever write individually.'))

    F.append(callout('The number that decides everything',
        'Not price. Not conversion. <b>Rides per active member per month.</b> A member who rides '
        'twice a month renews, invites friends and is worth showing to a sponsor. A member who '
        'rides twice a year churns and is worth nothing to anyone. Every product decision should '
        'be judged against whether it increases that number.',
        accent=MOSS, bg=colors.HexColor('#E4EDE7')))

    F.append(PageBreak())

    # ---------------------------------------------------- why people pay
    sec('06', 'Why anyone would pay')
    F.append(P('People do not subscribe to a feed. They subscribe to belonging, to access, or to '
        'something that saves them more than it costs. REV can offer all three, and should lead '
        'with the third because it is the easiest to believe.', 'lead'))

    F.append(H2('The four reasons, in order of persuasive power'))

    F.append(H3('1 · It pays for itself'))
    F.append(P('The most reliable subscription argument in India is arithmetic. If membership '
        'costs less than what it saves in a year on servicing, tyres, gear or fuel-stop discounts, '
        'the decision stops being emotional. This requires partnership work before it requires '
        'product work — and it is a reason to sign partners early even at unfavourable terms, '
        'because their discounts are your conversion engine.'))

    F.append(H3('2 · Access that cannot be bought elsewhere'))
    F.append(bullets([
        '<b>Capped rides.</b> Small rosters with experienced captains, open to paid members first.',
        '<b>Early RSVP.</b> A head start on popular rides. Costs nothing, and scarcity is real.',
        '<b>Curated routes.</b> Corridors worth riding, with the stops that make them worth it.',
        '<b>Marquee runs.</b> The annual hill run, the coastal overnight — the ones people plan '
        'their year around.',
    ]))

    F.append(H3('3 · Standing inside the community'))
    F.append(P('Riders care about how they are seen by other riders. A verified badge, a founding-'
        'member mark, a Garage that looks good, a visible record of rides led and ridden — these '
        'cost nothing to produce and are the reason people stay. Status is the cheapest retention '
        'mechanism ever invented, and the most durable.'))

    F.append(H3('4 · Safety that is worth money'))
    F.append(P('Roadside assistance on ride days, a group accident cover, a verified-contact '
        'emergency chain. This is the tier that converts the rider\'s family as much as the rider. '
        'It requires an insurance or assistance partner, so it belongs in a later phase — but it '
        'is the single most defensible reason to charge, and worth building toward.'))

    F.append(H2('Suggested tier structure'))
    F.append(table([
        ['', 'Free', 'Paid member', 'Captain / founding'],
        ['Verified profile & Garage', 'Yes', 'Yes', 'Yes'],
        ['Browse and join rides', 'Yes', 'Yes', 'Yes'],
        ['Ride chat & roster', 'Yes', 'Yes', 'Yes'],
        ['Create rides', 'Limited', 'Unlimited', 'Unlimited'],
        ['Early RSVP window', '—', 'Yes', 'Yes'],
        ['Partner discounts', '—', 'Yes', 'Yes'],
        ['Capped & curated rides', '—', 'Yes', 'Yes'],
        ['Ride-day assistance cover', '—', 'Later phase', 'Later phase'],
        ['Standing & recognition', '—', 'Member mark', 'Captain mark, founding badge'],
    ], [fw*0.34, fw*0.18, fw*0.24, fw*0.24],
       align={1:'CENTER',2:'CENTER',3:'CENTER'}))
    F.append(Paragraph('Keep the free tier genuinely good. A crippled free tier kills the density '
                       'that makes the paid tier worth buying.', S['cap']))

    F.append(PageBreak())

    # ---------------------------------------------------- pros and cons
    sec('07', 'Honest assessment')

    F.append(H2('What works in your favour'))
    F.append(table([
        ['Strength', 'Why it is real'],
        ['Verification is a genuine moat',
         'Anyone can build a listings app. Building one where every member is a real, contactable, '
         'accountable person is a standard that is hard to retrofit and harder to fake.'],
        ['The platform is already built',
         'Most people at this stage have a pitch deck. You have a working, security-audited '
         'product. That converts months of risk into weeks of go-to-market.'],
        ['Operating costs are near zero',
         'You can run this for a long time without revenue, which means you can wait for density '
         'instead of forcing monetisation early and killing the community.'],
        ['Not being present is a feature',
         'It keeps you out of duty-of-care territory, keeps costs flat as you add cities, and '
         'makes the model expandable without hiring in each one.'],
        ['The audience already spends',
         'This is not a market you must convince to care. Riders already spend on gear, servicing '
         'and travel. You are intercepting existing spend, not creating new demand.'],
    ], [fw*0.28, fw*0.72]))

    F.append(H2('What works against you'))
    F.append(table([
        ['Risk', 'Severity', 'What it actually means'],
        ['Cold start', 'Critical',
         'An empty feed is worthless. No rides means no riders means no rides. This kills most '
         'community products and it is the problem to solve before any other.'],
        ['WhatsApp is free and already there', 'High',
         'Your competitor is not another app. It is a habit with zero friction. You must be '
         'clearly better at something WhatsApp is clearly bad at — trust, discovery and rosters.'],
        ['A serious incident', 'Existential',
         'If someone is badly hurt on a ride found through REV, terms of use will not protect the '
         'brand even where they protect the entity. Safety posture is reputation management.'],
        ['Low willingness to pay', 'High',
         'Indian consumers pay reluctantly for hobby software. Assume this and build the '
         'partnership stream in parallel rather than discovering it late.'],
        ['Seasonality and churn', 'Medium',
         'Riding is weather- and season-dependent. Annual billing and off-season content matter '
         'more than they would elsewhere.'],
        ['Moderation load', 'Medium',
         'Every community platform eventually gets harassment, spam and disputes. It arrives '
         'sooner than founders expect and it costs time, not money.'],
        ['Founder concentration', 'Medium',
         'One person cannot recruit captains, moderate, sell partnerships and build. Sequence it '
         'or find a partner for the parts you will not do well.'],
    ], [fw*0.22, fw*0.13, fw*0.65]))

    F.append(PageBreak())

    # ---------------------------------------------------- go to market
    sec('08', 'Launch strategy')
    F.append(P('The entire launch problem is the cold start. Everything below is subordinate to '
        'solving it.', 'lead'))

    F.append(H2('Recruit supply, not demand'))
    F.append(P('Do not launch to riders. Launch to <b>captains</b>. Twenty to thirty people who '
        'already lead rides in Chennai, who already have a WhatsApp group, and who already do this '
        'coordination badly. Bring them on individually, by hand, before any public launch. Each '
        'one arrives with a group. A rider who opens REV and sees eight real rides this weekend '
        'stays; one who sees an empty feed never returns, and you only get one attempt at them.'))

    F.append(H2('Win one corridor completely'))
    F.append(P('Not Chennai. <b>East Coast Road</b>. One corridor, one riding culture, one set of '
        'breakfast stops. Density on a single route beats presence across a city, because a rider '
        'judges the platform by whether it has something for them <i>this Sunday</i> — not by how '
        'many cities it covers. Own ECR completely, then GST Road, then Bengaluru.'))

    F.append(H2('Establish a ritual'))
    F.append(P('A community needs a heartbeat. One anchor ride at the same time every week, '
        'reliably, whether four people come or forty. Rituals create habit, habit creates '
        'retention, and retention is what you will be selling to partners. This is the single '
        'highest-leverage thing you can personally do, and it does not require you to be on the '
        'ride — only to make sure it happens.'))

    F.append(H2('Go where riders already are'))
    F.append(bullets([
        '<b>Service centres and dealerships</b> on Saturday mornings — the highest concentration '
        'of your exact audience anywhere.',
        '<b>Existing WhatsApp groups</b> — do not compete with them, recruit their admins as '
        'captains and let them keep their group.',
        '<b>Breakfast stops on ECR</b> — the cafés already know the regulars, and they want the '
        'groups.',
        '<b>Gear and accessory shops</b> — natural first partners for the discount programme that '
        'makes membership pay for itself.',
    ]))

    F.append(H2('Sequence'))
    F.append(table([
        ['Phase', 'Focus', 'What "done" looks like'],
        ['0 · Close the blockers',
         'Company, SMS provider, legal review',
         'Real phone verification working end to end'],
        ['1 · Seed supply',
         'Recruit 20–30 captains by hand, seed real rides',
         'Eight or more genuine rides listed for the coming weekend'],
        ['2 · Private beta',
         'Captains bring their groups. Invite only.',
         '300–500 verified members; the weekly anchor ride is running'],
        ['3 · Open launch',
         'Public signups, one city, one corridor',
         'Rides happening without you prompting them'],
        ['4 · Monetise',
         'Partner discounts first, then paid tier',
         'Membership demonstrably saves more than it costs'],
        ['5 · Expand',
         'Second corridor, then second city',
         'The playbook repeats without new engineering'],
    ], [fw*0.24, fw*0.36, fw*0.40]))

    F.append(PageBreak())

    # ---------------------------------------------------- risk management
    sec('09', 'Safety and risk management')
    F.append(P('You are not present at rides, so the platform must carry the safety posture. This '
        'is both an obligation and the strongest reason a cautious rider — or their family — '
        'chooses REV over a WhatsApp group.', 'lead'))

    F.append(table([
        ['Measure', 'Status', 'Purpose'],
        ['Phone verification for every member', 'Built',
         'No anonymous participants. Everyone is contactable and accountable.'],
        ['Exact meeting point withheld until joined', 'Built',
         'A public listing never discloses where a named person will physically be.'],
        ['Phone numbers never displayed', 'Built',
         'Removes the most common harassment vector in community platforms.'],
        ['Report and block, on every profile and ride', 'Built',
         'Members police the community; you act on what is reported.'],
        ['SOS with member-nominated contacts', 'Built',
         'Emergency help reaches the people who can actually act, not a support inbox.'],
        ['Immutable audit log', 'Built',
         'Every consequential action is recorded, which matters if anything is ever disputed.'],
        ['Published Ride Charter, accepted by captains', 'To write',
         'Sets the standard in writing and evidences the platform\'s diligence.'],
        ['Incident response procedure', 'To write',
         'A stated process for what happens within an hour, a day and a week of an incident.'],
        ['Licence and registration verification tier', 'Later phase',
         'Raises verification from "real person" to "legally entitled to be on the road".'],
        ['Insurance or assistance partnership', 'Later phase',
         'Converts safety from a promise into a product members will pay for.'],
    ], [fw*0.32, fw*0.14, fw*0.54]))

    F.append(callout('The thing to decide before launch, not after',
        'Write the incident response procedure now, while nothing has happened. Who is called, in '
        'what order, within what time. What is said publicly and what is not. Who speaks for REV. '
        'A community forgives an accident it could not have prevented; it does not forgive a '
        'platform that appeared not to care in the hours afterwards.',
        accent=COPPER, bg=colors.HexColor('#F3E7E1')))

    F.append(PageBreak())

    # ---------------------------------------------------- measuring
    sec('10', 'What to measure')
    F.append(P('Vanity metrics will mislead you here. Signups are easy to generate and mean '
        'nothing. These are the numbers that actually indicate whether this is working.', 'lead'))

    F.append(table([
        ['Metric', 'Why it is the honest one', 'Healthy signal'],
        ['Rides created per week',
         'Supply is the constraint. This is the number that predicts everything downstream.',
         'Rising without you prompting it'],
        ['Rides per active member per month',
         'The single best indicator of whether REV is a habit or a curiosity.',
         'Above one, and climbing'],
        ['Roster fill rate',
         'Whether listed rides actually attract people, or sit empty.',
         'Most rides more than half full'],
        ['Show-up rate against RSVP',
         'The trust metric. If people RSVP and do not appear, the core promise is failing.',
         'High and stable'],
        ['Repeat captains',
         'A captain who leads a second ride has validated the product better than any survey.',
         'Most captains lead again'],
        ['Week-four retention',
         'Whether the community survives the novelty period.',
         'Flattening rather than decaying'],
        ['Reports per hundred rides',
         'Community health. Zero is suspicious; rising is a warning.',
         'Low, stable, all resolved'],
    ], [fw*0.24, fw*0.52, fw*0.24]))

    F.append(H2('The question to ask every month'))
    F.append(Paragraph('"If I stopped promoting REV entirely for one month, would rides still '
        'happen?" Until the answer is yes, you have an initiative rather than a community — and '
        'no amount of monetisation work will change that.', S['quote']))

    F.append(PageBreak())

    # ---------------------------------------------------- appendix
    sec('11', 'Appendix — what is built today')
    F.append(P('Recorded so the commercial plan can be read against the actual state of the '
        'product rather than an intention.'))

    F.append(H2('Working and verified'))
    F.append(table([
        ['Area', 'Detail'],
        ['Identity',
         'Phone-based sign-up and sign-in, account creation with 18+ enforcement, consent recorded '
         'with version and timestamp, editable profile, data export, and account deletion that '
         'genuinely erases.'],
        ['Garage',
         'Vehicle records per world with make, model, year, modifications, riding style and '
         'photographs. Persists across sessions.'],
        ['Rides',
         'Creation with real road routing, live map preview, capacity control enforced by the '
         'database, rosters, join and leave, captain roster management, and a lifecycle that '
         'derives upcoming, live and completed from the clock.'],
        ['Communication',
         'Ride-scoped chat readable only by confirmed riders, delivered in real time.'],
        ['Trust & safety',
         'Reporting, blocking, emergency contacts and an SOS path, plus an immutable audit log.'],
        ['Membership',
         'Tier structure and records in place; payment collection deliberately not connected.'],
    ], [fw*0.20, fw*0.80]))

    F.append(H2('Security posture'))
    F.append(bullets([
        'Every table enforces row-level security, denying by default rather than permitting by '
        'default.',
        'Phone numbers and dates of birth live in a schema the public interface cannot reach on '
        'any code path — not a policy, a structural impossibility.',
        'Exact meeting coordinates are held separately and released only to a ride\'s confirmed '
        'roster.',
        'Trust signals such as verification status cannot be set by a member, only earned.',
        'Capacity is enforced atomically, so two riders cannot take the same last seat.',
        'Verified by an adversarial test suite covering privilege escalation, data leakage, '
        'roster tampering and unauthorised access; the hosting provider\'s security advisor '
        'reports no warnings.',
    ]))

    F.append(H2('Not yet built'))
    F.append(bullets([
        'Ride recaps and post-ride photo galleries.',
        'Photograph upload to permanent storage — currently placeholders.',
        'Payment collection and the live membership purchase flow.',
        'Licence and vehicle registration verification.',
        'Push notifications.',
        'Native mobile applications — the platform is a responsive web app today.',
    ]))

    F.append(rule(HAIRLINE, 0.6, 12, 8))
    F.append(Paragraph(
        'This document contains illustrative financial models, not forecasts, and is not legal, '
        'tax or investment advice. The Terms of Use and Privacy Policy referenced here are drafts '
        'that require review by a qualified Indian lawyer before REV accepts members or payments.',
        S['small']))

    doc.build(F)

if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else 'REV-Product-and-Business-Document.pdf'
    build(out)
    print('written:', out)
