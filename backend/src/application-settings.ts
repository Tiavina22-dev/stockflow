import { BadRequestException, Body, Controller, Get, Param, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOperation, ApiParam, ApiProperty, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ApiDomainErrors, ApiRecord } from './finance-contract';
import { IsArray, ArrayMinSize, ArrayUnique, IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission } from './auth';
import { PrismaService } from './prisma.service';

export const defaults = {
 stock: { autoriserStockNegatif:true,alerteStockInsuffisant:true,seuilParDefautDeStockFaible:5,validationObligatoirePourInventaire:true,autoriserTransfertsEntreMagasins:true,motifObligatoirePourCorrection:true,alerteStockFaible:true,alerteRuptureDeStock:true },
 ventes: { prefixeNumeroDeVente:'VTE',formatDeNumeroDeVente:'AAAA-NNNNN',autoriserBrouillons:true,imprimerRecuApresValidation:false,autoriserAnnulation:true,clientObligatoire:false,motifObligatoirePourAnnulation:true,autoriserModificationApresValidation:true,modesDePaiement:['especes','mobile-money','bancaire'],afficherHeuresDansLeCahier:true,afficherVentesAnnulees:true,nombreDeVentesParPage:25 },
 facturation: {coordonneesFiscales:'',nif:'',stat:'',rcs:'',adresse:'',telephone:'',email:'',devise:'MGA',prefixeDeFacture:'FAC',formatDuNumeroDeFacture:'AAAA-NNNNN',affichageSurLaFacture:'a4',afficherLogo:true,afficherAdresse:true,afficherIdentifiantsFiscaux:true,afficherTelephoneEtEmail:true,afficherInformationsClient:true,afficherConditionsDePaiement:true},
};
export type Rubric = keyof typeof defaults;
export async function readSettings(tx: Prisma.TransactionClient, id: Rubric): Promise<Record<string,any>> {
 const row=await tx.applicationSettings.findUnique({where:{id}});
 return {...defaults[id],...(row?.values as Prisma.JsonObject??{})};
}
export class StockFormDto {
 @IsBoolean() autoriserStockNegatif:boolean;
 @IsBoolean() alerteStockInsuffisant:boolean;
 @IsInt() @Min(0) @Max(1000000000) seuilParDefautDeStockFaible:number;
 @IsBoolean() validationObligatoirePourInventaire:boolean;
 @IsBoolean() autoriserTransfertsEntreMagasins:boolean;
 @IsBoolean() motifObligatoirePourCorrection:boolean;
 @IsBoolean() alerteStockFaible:boolean;
 @IsBoolean() alerteRuptureDeStock:boolean;
}
const formats=['AAAA-NNNNN','AAAAMM-NNNN','NNNNNN'];
export class SalesFormDto {
 @IsString() @MinLength(1) @MaxLength(20) prefixeNumeroDeVente:string;
 @IsIn(formats) formatDeNumeroDeVente:string;
 @IsInt() @Min(1) @Max(999999999) prochainNumero:number;
 @IsBoolean() autoriserBrouillons:boolean;
 @IsBoolean() imprimerRecuApresValidation:boolean;
 @IsBoolean() autoriserAnnulation:boolean;
 @IsBoolean() clientObligatoire:boolean;
 @IsBoolean() motifObligatoirePourAnnulation:boolean;
 @IsBoolean() autoriserModificationApresValidation:boolean;
 @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(['especes','mobile-money','bancaire'],{each:true}) modesDePaiement:string[];
 @IsBoolean() afficherHeuresDansLeCahier:boolean;
 @IsBoolean() afficherVentesAnnulees:boolean;
 @IsInt() @Min(1) @Max(100) nombreDeVentesParPage:number;
}
export class InvoiceFormDto {
 @IsString() @MaxLength(150) coordonneesFiscales:string;
 @IsString() @MaxLength(50) nif:string;
 @IsString() @MaxLength(50) stat:string;
 @IsString() @MaxLength(50) rcs:string;
 @IsString() @MaxLength(500) adresse:string;
 @IsString() @MaxLength(50) telephone:string;
 @IsString() @MaxLength(254) email:string;
 @IsIn(['MGA']) devise:string;
 @IsString() @MinLength(1) @MaxLength(20) prefixeDeFacture:string;
 @IsIn(formats) formatDuNumeroDeFacture:string;
 @IsInt() @Min(1) @Max(999999999) prochainNumero:number;
 @IsIn(['a4','ticket-80mm']) affichageSurLaFacture:string;
 @IsBoolean() afficherLogo:boolean;
 @IsBoolean() afficherAdresse:boolean;
 @IsBoolean() afficherIdentifiantsFiscaux:boolean;
 @IsBoolean() afficherTelephoneEtEmail:boolean;
 @IsBoolean() afficherInformationsClient:boolean;
 @IsBoolean() afficherConditionsDePaiement:boolean;
}
function calendar(date:Date) {return new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo',year:'numeric',month:'2-digit'}).format(date).replace('-','');}
export async function nextNumber(tx:Prisma.TransactionClient,kind:string,date:Date) {
 const sales=kind==='SALE', invoice=kind==='CUSTOMER_INVOICE';
 const settings=sales||invoice?await readSettings(tx,sales?'ventes':'facturation'):null;
 const format=settings?.[sales?'formatDeNumeroDeVente':'formatDuNumeroDeFacture'];
 const y=Number(calendar(date).slice(0,4)),year=format==='NNNNNN'?0:y;
 const row=await tx.businessSequence.upsert({where:{kind_year:{kind,year}},create:{kind,year,value:1},update:{value:{increment:1}}});
 const prefix=settings?.[sales?'prefixeNumeroDeVente':'prefixeDeFacture']??kind;
 const segment=format==='NNNNNN'?'':`${format==='AAAAMM-NNNN'?calendar(date):y}-`;
 return `${prefix}-${segment}${String(row.value).padStart(format==='AAAA-NNNNN'?5:format==='AAAAMM-NNNN'?4:6,'0')}`;
}
@ApiTags('settings') @ApiExtraModels(StockFormDto,SalesFormDto,InvoiceFormDto) @ApiDomainErrors() @ApiBearerAuth() @Controller('settings/forms')
export class ApplicationSettingsController {
 constructor(private readonly db:PrismaService){}
 @Get(':rubric') @RequirePermission('settings.read') @ApiOperation({summary:'Valeurs des formulaires ; prochain compteur réel et protégé'})
 @ApiParam({name:'rubric',enum:['stock','ventes','facturation']})
 @ApiResponse({status:200,schema:{oneOf:[StockFormDto,SalesFormDto,InvoiceFormDto].map(dto=>({$ref:getSchemaPath(dto)}))}})
 async get(@Param('rubric') rubric:string) {
  if(!Object.hasOwn(defaults,rubric)) throw new BadRequestException('Rubrique inconnue.');
  return this.db.$transaction(async tx=>{
   const values=await readSettings(tx,rubric as Rubric);
   if(rubric==='stock') values.autoriserStockNegatif=(await tx.stockSettings.upsert({where:{id:'global'},create:{},update:{}})).allowNegativeStock;
   if(rubric==='facturation') { const c=await tx.companySettings.upsert({where:{id:'global'},create:{},update:{}}); Object.assign(values,{coordonneesFiscales:c.name,nif:c.nif,stat:c.stat,rcs:c.rcs,adresse:c.address,telephone:c.phone}); }
   if(rubric!=='stock') {const kind=rubric==='ventes'?'SALE':'CUSTOMER_INVOICE';const format=values[rubric==='ventes'?'formatDeNumeroDeVente':'formatDuNumeroDeFacture']; const year=format==='NNNNNN'?0:Number(calendar(new Date()).slice(0,4));const seq=await tx.businessSequence.findUnique({where:{kind_year:{kind,year}}}); values.prochainNumero=(seq?.value??0)+1;}
   return values;
  });
 }
 async save(rubric:Rubric,body:StockFormDto|SalesFormDto|InvoiceFormDto,actor:Actor) {
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(874302)::text`;
   const before=await readSettings(tx,rubric);
   const values={...body} as Record<string,any>;
   if(rubric==='stock') await tx.stockSettings.upsert({where:{id:'global'},create:{allowNegativeStock:values.autoriserStockNegatif},update:{allowNegativeStock:values.autoriserStockNegatif}});
   if(rubric!=='stock') {
    const kind=rubric==='ventes'?'SALE':'CUSTOMER_INVOICE',format=values[rubric==='ventes'?'formatDeNumeroDeVente':'formatDuNumeroDeFacture'];
    const prefix=values[rubric==='ventes'?'prefixeNumeroDeVente':'prefixeDeFacture'];
    if(!/^[A-Za-z0-9_-]+$/.test(prefix)) throw new BadRequestException('Préfixe : lettres, chiffres, tiret ou soulignement.');
    const year=format==='NNNNNN'?0:Number(calendar(new Date()).slice(0,4));
    const row=await tx.businessSequence.upsert({where:{kind_year:{kind,year}},create:{kind,year,value:values.prochainNumero-1},update:{}});
    if(values.prochainNumero<=row.value) throw new BadRequestException('Le compteur ne peut pas revenir en arrière. Rechargez les paramètres.');
    await tx.businessSequence.update({where:{kind_year:{kind,year}},data:{value:values.prochainNumero-1}});delete values.prochainNumero;
   }
   if(rubric==='facturation') await tx.companySettings.upsert({where:{id:'global'},create:{name:values.coordonneesFiscales||'StockFlow',nif:values.nif,stat:values.stat,rcs:values.rcs,address:values.adresse,phone:values.telephone},update:{name:values.coordonneesFiscales||'StockFlow',nif:values.nif,stat:values.stat,rcs:values.rcs,address:values.adresse,phone:values.telephone}});
   await tx.applicationSettings.upsert({where:{id:rubric},create:{id:rubric,values},update:{values}});
   await tx.auditEvent.create({data:{actorId:actor.id,action:`settings.${rubric}.update`,entityType:'ApplicationSettings',entityId:rubric,oldValue:before,newValue:values}});
   return {saved:true};
  },{isolationLevel:'Serializable'});
 }
 @Patch('stock') @RequirePermission('settings.update') @ApiRecord({type:'object',properties:{saved:{type:'boolean'}}}) saveStock(@Body() b:StockFormDto,@Request() r:{actor:Actor}){return this.save('stock',b,r.actor);}
 @Patch('ventes') @RequirePermission('settings.update') @ApiRecord({type:'object',properties:{saved:{type:'boolean'}}}) saveSales(@Body() b:SalesFormDto,@Request() r:{actor:Actor}){return this.save('ventes',b,r.actor);}
 @Patch('facturation') @RequirePermission('settings.update') @ApiRecord({type:'object',properties:{saved:{type:'boolean'}}}) saveInvoices(@Body() b:InvoiceFormDto,@Request() r:{actor:Actor}){return this.save('facturation',b,r.actor);}
}
for(const [dto,values] of [[StockFormDto,defaults.stock],[SalesFormDto,{...defaults.ventes,prochainNumero:1}],[InvoiceFormDto,{...defaults.facturation,prochainNumero:1}]] as const) {
 for(const [key,value] of Object.entries(values)) ApiProperty({type:Array.isArray(value)?[String]:typeof value==='boolean'?Boolean:typeof value==='number'?Number:String,default:value})(dto.prototype,key);
}
@ApiTags('preferences') @ApiBearerAuth() @Controller('preferences')
export class PreferencesController {
 constructor(private readonly db:PrismaService){}
 @Get() @ApiOperation({summary:'Préférences d’usage sans permission settings.read ; session obligatoire'})
 get(){return this.db.$transaction(async tx=>({stock:await readSettings(tx,'stock'),ventes:await readSettings(tx,'ventes')}));}
}
