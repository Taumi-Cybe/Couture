export const fabrics=['Lin','Coton','Wax','Bazin','Soie','Pagne tissé','Jacquard','Satin','Bogolan','Dentelle'];
const definitions=[
 ['Tailleur Alba','Femme','Oversize','Lin','Un blazer ample et un pantalon large, pour une silhouette libre et structurée.'],
 ['Ensemble Forest','Homme','Oversize','Coton','Chemise généreuse, épaules tombantes et pantalon ample.'],
 ['Robe Awa','Femme','Pagne & wax','Wax','Une robe portefeuille longue, ajustable à la taille.'],
 ['Boubou Indigo','Homme','Cérémonie','Bazin','Des volumes traditionnels et des finitions brodées.'],
 ['Robe Minuit','Femme','Cérémonie','Satin','Une ligne sculptée, pensée pour les grandes occasions.'],
 ["Tunique Prestige", "Homme", "Cérémonie", "Bazin", "Une tunique ivoire aux broderies contrastées."],
 ["Ensemble brodé", "Homme", "Essentiels", "Coton", "Une veste courte brodée et un pantalon ajusté."],
 ["Robe Nila", "Femme", "Pagne & wax", "Wax", "Une robe longue et des épaules volantées."],
 ["Kaftan graphique", "Femme", "Essentiels", "Pagne tissé", "Un volume généreux et des motifs contrastés."],
 ["Ensemble Argile", "Homme", "Pagne & wax", "Wax", "Chemise et pantalon coordonnés, esprit décontracté."],
 ["Robe de cérémonie", "Femme", "Cérémonie", "Wax", "Un décolleté travaillé et une jupe longue."],
 ["Robe Safran", "Femme", "Pagne & wax", "Wax", "Une robe évasée et des manches bouffantes."],
 ["Tunique plastron", "Homme", "Cérémonie", "Bazin", "Un plastron brodé sur une coupe épurée."],
 ["Robe asymétrique", "Femme", "Cérémonie", "Wax", "Une épaule dégagée et une ligne près du corps."],
 ["Grand boubou", "Homme", "Cérémonie", "Bazin", "Des volumes traditionnels et un tombé ample."],
 ["Ensemble péplum", "Femme", "Pagne & wax", "Pagne tissé", "Une jupe longue et un haut à basque."],
 ["Costume Indigo", "Homme", "Tailoring", "Jacquard", "Un costume contemporain aux motifs indigo."],
 ["Robe à étages", "Femme", "Pagne & wax", "Wax", "Des volants structurés pour une silhouette affirmée."],
 ["Robe drapée", "Femme", "Cérémonie", "Wax", "Une coupe asymétrique et une jupe longue drapée."],
 ["Kaftan Ébène", "Femme", "Essentiels", "Coton", "Une coupe fluide soulignée de broderies."]
];
export const looks=definitions.map(([name,gender,style,material,detail],i)=>({id:i+1,name,gender,style,material,detail,ref:`NY-${String(i+1).padStart(2,'0')}`,images:i<5?['front','side','back'].map(angle=>`/images/look-${String(i+1).padStart(2,'0')}-${angle}.webp`):[`/images/model-${[5,6,7,8,9,10,11,12,13,14,15,16,17,19,20][i-5]}.webp`]}));
export type Look=(typeof looks)[number];
export const models=Array.from({length:200},(_,i)=>({...looks[i%20],id:i+1,lookId:i%20+1,fabric:fabrics[Math.floor(i/20)],ref:`NY-${String(i+1).padStart(3,'0')}`}));
export const stages=['Commande enregistrée','Mesures prises','En confection','Essayage','Prête à récupérer','Récupérée'];
export const times=['09:00','10:00','11:00','14:00','15:00','16:00','17:00'];
export const appointmentLabels:Record<string,string>={pending:'En attente de confirmation',confirmed:'Rendez-vous confirmé',declined:'Rendez-vous refusé',cancelled:'Rendez-vous annulé'};
export type Price={look_id:number;labor:number|null;fabric:number|null;finishing:number|null;notes:string;fabric_included:boolean};
export type Shop={address:string;phone:string;hours:string;directions_note:string;currency:string};
export const emptyShop:Shop={address:'',phone:'',hours:'',directions_note:'',currency:'EUR'};
export const emptyPrice=(id:number):Price=>({look_id:id,labor:null,fabric:null,finishing:null,notes:'',fabric_included:false});
export function money(value:number|null|undefined,currency='EUR'){return value==null?'Sur devis':new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:currency==='XOF'?0:2}).format(value)}
export function total(p:Price){return p.labor===null?null:p.labor+(p.fabric_included?(p.fabric||0):0)+(p.finishing||0)}
