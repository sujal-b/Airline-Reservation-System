import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL || 'https://dzdvtelbyoviwnhsffeo.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'sb_publishable_sG_peu5yZW1a_ivgUz8YlQ_56vGwIBG'
  );

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Malformed Authorization Header');
    }

    // 1. Validate JWT centrally to check for revocations (Pro-strategy)
    const { data: { user }, error } = await this.supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;

    // 2. Dual-Schema Sync (Pro-strategy)
    let dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      dbUser = await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email || '',
          password: 'supabase_auth_managed',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Passenger',
        }
      });
    }

    // Pass the actual Database user (which holds the exact 'Role') onto the request object too
    request.dbUser = dbUser;

    return true;
  }
}
