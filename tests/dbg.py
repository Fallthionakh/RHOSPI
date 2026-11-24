import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page();await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(400)
        await pg.select_option('#profil','chef')
        print(await pg.evaluate("JSON.stringify({role:S.profil.role,scope:scope(),can:can('avis'),CAN:CAN.avis,menu:ROLES.chef.menu.includes('demandes'),dm:DB.demandes.map(m=>[m.nature,ag(m.agentId).serviceId,m.statut,!!m.avis,canAvis(ag(m.agentId))])})"))
        await b.close()
asyncio.run(main())
